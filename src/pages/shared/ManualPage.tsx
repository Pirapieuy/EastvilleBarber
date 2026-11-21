import { TANGGAL_MULAI } from "../../utils/tanggal"
import { FormEvent, useEffect, useState } from "react"
import { apiKasir, apiKodeDiskon, apiTransaksi, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { SearchSelect } from "../../components/common/SearchSelect"
import { TimePicker } from "../../components/common/TimePicker"
import {
  Button,
  CalendarPicker,
  LoadingState,
  rupiah, ErrorState } from "../../components/common/UI"

interface ManualItem {
  tipe: "Layanan" | "Produk"
  id: string
  name: string
  price: number
  stok?: number
}
const demoItems: ManualItem[] = [
  { tipe: "Layanan", id: "1", name: "Haircut", price: 40000 },
  { tipe: "Layanan", id: "3", name: "Shaving", price: 25000 },
  { tipe: "Layanan", id: "5", name: "Treatment", price: 60000 },
]
const demoKapster = [
  { id: "u-kapster", nama: "Ferdi" },
  { id: "u-kapster2", nama: "Seva" },
]

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function notaOtomatis(tanggal: string) {
  const [y, m, d] = tanggal.split("-")
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `BUKU-${d}${m}${y.slice(2)}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

export function ManualPage() {
  const [items, setItems] = useState<ManualItem[]>(demoItems)
  const [kapster, setKapster] = useState(demoKapster)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  const [tanggal, setTanggal] = useState(today)
  const [jam, setJam] = useState("12:00")
  const [note, setNote] = useState(() => notaOtomatis(today()))
  const [notaDiubah, setNotaDiubah] = useState(false)
  const [kapsterId, setKapsterId] = useState("")
  const [qty, setQty] = useState<Record<string, number>>({})
  const [cari, setCari] = useState("")
  const [diskon, setDiskon] = useState("")
  const [diskonJenis, setDiskonJenis] = useState<"nominal" | "persen">("nominal")
  const [kodeInput, setKodeInput] = useState("")
  const [kodeError, setKodeError] = useState("")
  const [kodeChecking, setKodeChecking] = useState(false)
  const [promo, setPromo] = useState<{
    kode: string
    nama: string
    jenis: "persen" | "nominal"
    nilai: number
  } | null>(null)
  const [promoList, setPromoList] = useState<
    { id: string; kode: string; nama: string; persen: number; jenis: "persen" | "nominal"; nilai: number; berlakuSampai: string }[]
  >([])
  const [pin, setPin] = useState("")
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState("")
  const [qris, setQris] = useState("")
  // Gabungan: isi salah satu (tunai atau QRIS), sisanya dihitung otomatis, sama seperti di Kasir.
  const [komisiLayanan, setKomisiLayanan] = useState<"Normal" | "OT">("Normal")
  const [gabunganDari, setGabunganDari] = useState<"tunai" | "qris">("tunai")
  const [saving, setSaving] = useState(false)
  const [ringkasOpen, setRingkasOpen] = useState(false)
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
              jenis: r.jenis === "nominal" ? "nominal" : "persen",
              nilai: Number(r.nilai) || Number(r.persen),
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
                stok: p.stok,
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
    ? Math.min(
        subtotal,
        promo.jenis === "nominal"
          ? promo.nilai
          : Math.round((subtotal * promo.nilai) / 100),
      )
    : diskonJenis === "persen"
      ? Math.round((subtotal * Math.min(100, Number(diskon.replace(/\D/g, "")) || 0)) / 100)
      : Math.min(Number(diskon.replace(/\D/g, "")) || 0, subtotal)
  const total = subtotal - diskonNum
  const kapsterAktif = kapsterId
  const cashNum = Number(cash.replace(/\D/g, "")) || 0
  const qrisNum = Number(qris.replace(/\D/g, "")) || 0
  const qrisPakai =
    method === "Tunai"
      ? 0
      : method === "QRIS"
        ? total
        : gabunganDari === "qris"
          ? Math.min(qrisNum, total)
          : Math.max(0, total - Math.min(cashNum, total))
  const tunaiPakai =
    method === "QRIS"
      ? 0
      : method === "Tunai"
        ? cashNum
        : gabunganDari === "qris"
          ? Math.max(0, total - qrisPakai)
          : Math.min(cashNum, total)
  const paid = tunaiPakai + qrisPakai
  const cleanNote = note.trim()
  const notaOk = cleanNote.length >= 3 && Boolean(kapsterId)
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
  const gabunganKosong = method === "Gabungan" && cashNum <= 0 && qrisNum <= 0
  const kembalian = method === "Tunai" ? Math.max(0, cashNum - total) : 0
  const canSave =
    selected.length > 0 &&
    Boolean(kapsterAktif) &&
    cleanNote.length >= 3 &&
    paid >= total &&
    total > 0 &&
    !gabunganKosong &&
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
      setPromo({
        kode: hasil.kode,
        nama: hasil.nama,
        jenis: hasil.jenis === "nominal" ? "nominal" : "persen",
        nilai: Number(hasil.nilai) || hasil.persen,
      })
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
      const cur = prev[keyOf(item)] ?? 0
      let next = Math.max(0, cur + delta)
      if (delta > 0 && item.stok != null) next = Math.min(next, item.stok)
      return { ...prev, [keyOf(item)]: next }
    })
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    if (notaOk) setRingkasOpen(true)
  }

  async function executeSave() {
    setSaving(true)
    try {
      const res = await apiTransaksi.manual({
        tanggal,
        jam,
        nomorNota: cleanNote,
        metode: method,
        diskon: diskonNum,
        bayarTunai: tunaiPakai,
        bayarQris: qrisPakai,
        kodeDiskon: promo ? promo.kode : undefined,
        komisiLayanan: selected.some((i) => i.tipe === "Layanan") ? komisiLayanan : undefined,
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
      setDiskonJenis("nominal")
      setKodeInput("")
      setPromo(null)
      setPin("")
      setCash("")
      setQris("")
      setNote(notaOtomatis(tanggal))
      setNotaDiubah(false)
      setKapsterId("")
      setGabunganDari("tunai")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan nota.")
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
            const maxed = it.stok != null && n >= it.stok
            return (
              <div
                className={`nota-item ${n > 0 ? "active" : ""} ${maxed ? "maxed" : ""}`}
                key={keyOf(it)}
                onClick={maxed ? undefined : () => ubahQty(it, 1)}
                role="button"
                style={{ cursor: maxed ? "default" : "pointer" }}
              >
                <div className="nota-item-info">
                  <strong>{it.name}</strong>
                  <span>
                    {rupiah(it.price)}
                    {it.stok != null && <i className="nota-stock"> · stok {it.stok}</i>}
                  </span>
                </div>
                {n === 0 ? (
                  <Button
                    className={`secondary-button nota-add ${
                      it.tipe === "Produk"
                        ? "nota-add-product"
                        : "nota-add-service"
                    }`}
                    aria-label={`Tambah ${it.name}`}
                  >
                    <Icon name="plus" />
                  </Button>
                ) : (
                  <div className="nota-stepper">
                    <button
                      aria-label={`Kurangi ${it.name}`}
                      onClick={(e) => { e.stopPropagation(); ubahQty(it, -1) }}
                      type="button"
                    >
                      −
                    </button>
                    <output aria-live="polite">{n}</output>
                    <button
                      aria-label={`Tambah ${it.name}`}
                      disabled={maxed}
                      onClick={(e) => { e.stopPropagation(); ubahQty(it, 1) }}
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

  // Sudah login tapi data belum datang: tutup seluruh halaman dengan tulisan memuat.
  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content narrow manual-page">
        <LoadingState message="Memuat data Input Manual…" />
      </div>
    )
  }

  // Gagal memuat: bedakan jelas dari "sedang memuat" dan beri jalan keluar.
  if (Boolean(getToken()) && !live && liveError) {
    return (
      <div className="content narrow manual-page">
        <ErrorState
          title="Data Input Manual gagal dimuat"
          message={liveError}
          onRetry={() => window.location.reload()}
        />
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
              onChange={(e) => {
                setNotaDiubah(true)
                setNote(e.target.value.toUpperCase())
              }}
              placeholder="Contoh: BUKU-291026-01"
              required
              value={note}
            />
          </label>
          <div className="form-grid-field">
            <span>
              Kapster <b className="req-mark">*</b>
            </span>
            <SearchSelect
              aria-label="Kapster"
              onChange={(e) => setKapsterId(e.target.value)}
              value={kapsterAktif}
            >
              <option value="">Pilih kapster</option>
              {kapster.map((k) => (
                <option key={k.id + k.nama} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="manual-date-row">
          <div className="form-grid-field manual-date-field">
            <span>Tanggal</span>
            <CalendarPicker
              max={today()}
              min={TANGGAL_MULAI}
              showToday={false}
              value={tanggal}
              onChange={(v) => {
                setTanggal(v)
                if (!notaDiubah) setNote(notaOtomatis(v))
              }}
            />
          </div>
          <div className="form-grid-field manual-date-field">
            <span>Jam</span>
            <TimePicker align="right" onChange={setJam} value={jam} />
          </div>
          </div>
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
                <b>{promo.kode}</b> · {promo.nama} ({promo.jenis === "nominal" ? rupiah(promo.nilai) : `${promo.nilai}%`})
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
              <div className="manual-discount-manual">
                <div className="input-shell">
                  {diskonJenis === "nominal" && <b>Rp</b>}
                  <input
                    inputMode="numeric"
                    maxLength={diskonJenis === "persen" ? 3 : undefined}
                    onChange={(e) => setDiskon(e.target.value)}
                    placeholder="0"
                    value={diskon}
                  />
                  {diskonJenis === "persen" && <b>%</b>}
                </div>
                <div className="segmented manual-discount-type" role="group" aria-label="Jenis potongan">
                  {(["nominal", "persen"] as const).map((j) => (
                    <Button
                      className={diskonJenis === j ? "active" : ""}
                      key={j}
                      onClick={() => {
                        setDiskonJenis(j)
                        setDiskon("")
                      }}
                    >
                      {j === "nominal" ? "Rp" : "%"}
                    </Button>
                  ))}
                </div>
              </div>
              {diskonJenis === "persen" && diskonNum > 0 && (
                <small>Potongan {rupiah(diskonNum)}.</small>
              )}
            </label>
          )}
          {diskonNum > 0 && !promo && (
            <label>
              <span>PIN Owner</span>
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
        {selected.some((i) => i.tipe === "Layanan") && (
          <div className="commission-choice manual-komisi">
            <span>Komisi layanan</span>
            <div className="method-grid manual-komisi-grid" role="group" aria-label="Pilih komisi layanan">
              {(["Normal", "OT"] as const).map((value) => (
                <Button
                  className={komisiLayanan === value ? "active" : ""}
                  key={value}
                  onClick={() => setKomisiLayanan(value)}
                >
                  <strong>{value}</strong>
                  <small>{value === "Normal" ? "40%" : "50%"}</small>
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="form-grid manual-info-grid">
          {method !== "QRIS" && (
            <label>
              <span>{method === "Gabungan" ? "Jumlah tunai" : "Uang diterima"}</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
                  onChange={(e) => {
                    setGabunganDari("tunai")
                    setCash(e.target.value)
                  }}
                  placeholder={method === "Gabungan" ? "0" : String(total)}
                  value={
                    method === "Gabungan" && gabunganDari === "qris"
                      ? tunaiPakai || ""
                      : cash
                  }
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
              <span>Jumlah QRIS</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
                  onChange={(e) => {
                    setGabunganDari("qris")
                    setQris(e.target.value)
                  }}
                  placeholder="0"
                  value={gabunganDari === "tunai" ? qrisPakai || "" : qris}
                />
              </div>
            </label>
          )}
        </div>
        {method === "Gabungan" && (
          <p className="manual-qris-notice" role="note">
            Isi salah satu saja, sisanya dihitung otomatis.
            {gabunganKosong ? "" : ` Tunai ${rupiah(tunaiPakai)} + QRIS ${rupiah(qrisPakai)}.`}
          </p>
        )}
        {(method === "QRIS" || (method === "Gabungan" && qrisPakai > 0)) && (
          <p className="manual-qris-notice" role="note">
            Pastikan pembayaran QRIS berhasil sebelum menyimpan nota.
          </p>
        )}
        {method === "Tunai" && total > 0 && paid < total && (
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
              <dd>-{rupiah(diskonNum)}</dd>
            </div>
          )}
          <div className="nota-summary-total">
            <dt>Total</dt>
            <dd>{rupiah(total)}</dd>
          </div>
          {method === "Tunai" && cashNum > 0 && total > 0 && (
            <div>
              <dt>Kembalian</dt>
              <dd>{rupiah(kembalian)}</dd>
            </div>
          )}
        </dl>
      </section>
      </div>
      )}

      <div className="sticky-submit">
        <div className="manual-bar">
          <button
            aria-label="Buka rincian nota dan simpan"
            className="manual-total-button"
            disabled={!notaOk}
            onClick={() => {
              setError("")
              setSuccess("")
              setRingkasOpen(true)
            }}
            type="button"
          >
            <span className="manual-total-icon">
              <Icon name="receipt" />
            </span>
            {adaItem && notaOk ? (
              <>
                <span className="manual-total-label">Simpan Nota</span>
                <span className="manual-total-count">{selected.length} item</span>
                <b className="submit-total">{rupiah(total)}</b>
                <span className="manual-total-chevron" aria-hidden="true">
                  <Icon name="chevron" />
                </span>
              </>
            ) : (
              <span className="manual-total-label">
                {notaOk
                  ? "Pilih minimal satu layanan atau produk."
                  : "Pilih kapster dulu untuk melanjutkan."}
              </span>
            )}
          </button>
        </div>
      </div>
      {success && (
        <p className="manual-qris-notice manual-success-note" role="status">
          {success}
        </p>
      )}

      {ringkasOpen && (
        <div className="modal-overlay modal-centered" onClick={() => !saving && setRingkasOpen(false)} role="dialog" aria-modal="true" aria-label="Konfirmasi simpan nota">
          <section className="manual-ringkas" onClick={(e) => e.stopPropagation()}>
            <header className="manual-ringkas-head">
              <span><Icon name="receipt" /> Simpan nota {cleanNote}</span>
              <button type="button" aria-label="Tutup" disabled={saving} onClick={() => setRingkasOpen(false)}>
                <Icon name="chevron" />
              </button>
            </header>
            <div className="manual-ringkas-lines">
              <div className="cart-clear-row">
                <span className="cart-list-label">{selected.length} item</span>
                <Button
                  className="cart-clear-button"
                  onClick={() => {
                    setQty({})
                    setRingkasOpen(false)
                  }}
                  aria-label="Hapus semua layanan dan produk"
                >
                  <Icon name="trash" /> Hapus Semua
                </Button>
              </div>
              {selected.map((i) => (
                <div className="manual-ringkas-line" key={keyOf(i)}>
                  <div>
                    <strong>{i.name}</strong>
                    <small>{rupiah(i.price)}</small>
                  </div>
                  <div className="nota-stepper">
                    <button type="button" aria-label={`Kurangi ${i.name}`} onClick={() => ubahQty(i, -1)}>−</button>
                    <output>{qty[keyOf(i)]}</output>
                    <button type="button" aria-label={`Tambah ${i.name}`} onClick={() => ubahQty(i, 1)}>+</button>
                  </div>
                  <b>{rupiah(i.price * qty[keyOf(i)])}</b>
                </div>
              ))}
            </div>
            <dl className="nota-summary">
              <div><dt>Subtotal</dt><dd>{rupiah(subtotal)}</dd></div>
              {diskonNum > 0 && <div><dt>Diskon</dt><dd>-{rupiah(diskonNum)}</dd></div>}
              <div className="nota-summary-total"><dt>Total</dt><dd>{rupiah(total)}</dd></div>
            </dl>
            {(() => {
              const peringatan =
                error ||
                (!adaItem && "Pilih minimal satu layanan atau produk.") ||
                (gagalMuat && "Data server belum termuat. Coba muat ulang halaman.") ||
                (gabunganKosong && "Isi jumlah tunai atau QRIS untuk pembayaran gabungan.") ||
                (paid < total && "Uang yang diterima belum mencukupi total pembayaran.") ||
                (total <= 0 && "Total nota harus lebih dari Rp 0.") ||
                ""
              const info =
                !peringatan &&
                (live
                  ? "Data transaksi akan dicatat ke sistem dan stok produk terkait otomatis terpotong."
                  : "Mode demo: nota tidak disimpan ke server.")
              return peringatan ? (
                <p className="manual-payment-warning manual-ringkas-note" role="alert">{peringatan}</p>
              ) : (
                <p className="manual-qris-notice manual-ringkas-note" role="note">{info}</p>
              )
            })()}
            <Button
              className="primary-button"
              disabled={!canSave}
              onClick={async () => {
                setError("")
                if (!live) {
                  setSuccess("Mode demo: nota tidak disimpan ke server.")
                  setRingkasOpen(false)
                  return
                }
                await executeSave()
                setRingkasOpen(false)
              }}
            >
              {saving ? "Menyimpan…" : "Simpan Nota"}
            </Button>
          </section>
        </div>
      )}

    </form>
  )
}

export default ManualPage
