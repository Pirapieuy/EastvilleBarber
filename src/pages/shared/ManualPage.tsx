import { FormEvent, useEffect, useState } from "react"
import { apiKasir, apiTransaksi, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"

interface ManualItem {
  tipe: "Layanan" | "Produk"
  id: string
  name: string
  price: number
}
interface ManualLine {
  key: number
  itemId: string
  kapsterId: string
  qty: number
}

const demoItems: ManualItem[] = [
  { tipe: "Layanan", id: "1", name: "Haircut", price: 40000 },
  { tipe: "Layanan", id: "3", name: "Shaving", price: 25000 },
  { tipe: "Layanan", id: "5", name: "Treatment", price: 60000 },
]
const demoKapster = [
  { id: "k1", nama: "Seva" },
  { id: "k2", nama: "Tata" },
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
  const [lines, setLines] = useState<ManualLine[]>([])
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
            .map((l): ManualItem => ({ tipe: "Layanan", id: String(l.id), name: l.nama, price: l.harga })),
          ...produk
            .filter((p) => p.status === "Aktif")
            .map((p): ManualItem => ({ tipe: "Produk", id: p.kode, name: p.nama, price: p.harga })),
        ])
        setKapster(kap)
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat data rekap manual:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [])

  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className="content">
        <p>Memuat rekap manual...</p>
      </div>
    )
  }

  const priceOf = (l: ManualLine) => (items.find((i) => i.id === l.itemId)?.price ?? 0) * l.qty
  const total = lines.reduce((s, l) => s + priceOf(l), 0)
  const cashNum = Number(cash.replace(/\D/g, "")) || 0
  const qrisNum = Number(qris.replace(/\D/g, "")) || 0
  const paid = method === "Tunai" ? cashNum : method === "QRIS" ? total : cashNum + qrisNum
  const cleanNote = note.trim()
  const canSave = lines.length > 0 && cleanNote.length >= 3 && paid >= total && total > 0 && !saving

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: Date.now() + prev.length, itemId: items[0]?.id ?? "", kapsterId: kapster[0]?.id ?? "", qty: 1 },
    ])
  }
  function patchLine(key: number, patch: Partial<ManualLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!live) {
      setSuccess("Mode demo: tidak disimpan ke server.")
      return
    }
    setSaving(true)
    try {
      const res = await apiTransaksi.manual({
        tanggal,
        jam,
        nomorNota: cleanNote,
        metode: method,
        diskon: 0,
        bayarTunai: method === "QRIS" ? 0 : cashNum,
        bayarQris: method === "Tunai" ? 0 : qrisNum,
        items: lines.map((l) => ({
          tipe: items.find((i) => i.id === l.itemId)?.tipe ?? "Layanan",
          refId: items.find((i) => i.id === l.itemId)?.tipe === "Layanan" ? Number(l.itemId) : l.itemId,
          qty: l.qty,
          kapsterId: l.kapsterId,
        })),
      })
      setSuccess(`Tersimpan sebagai ${res.id} (${rupiah(res.total)}). Tandanya MANUAL di Riwayat.`)
      setLines([])
      setNote("")
      setCash("")
      setQris("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="content narrow" onSubmit={handleSave}>
      <DemoNotice live={live} error={liveError} />
      <PageTitle eyebrow="Transaksi dari buku" title="Input susulan" />
      <section className="panel form-panel">
        <h3>Informasi transaksi</h3>
        <div className="form-grid manual-info-grid">
          <label>
            <span>Tanggal transaksi</span>
            <input max={today()} onChange={(e) => setTanggal(e.target.value)} required type="date" value={tanggal} />
            <small>Tanggal masa depan dinonaktifkan.</small>
          </label>
          <label>
            <span>Jam (perkiraan)</span>
            <input onChange={(e) => setJam(e.target.value)} required type="time" value={jam} />
            <small>Di luar jam kerja dihitung lembur.</small>
          </label>
          <label>
            <span>Nomor nota dari buku</span>
            <input
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              placeholder="BUKU-291026-01"
              value={note}
            />
          </label>
        </div>
      </section>
      <section className="panel form-panel">
        <div className="section-title">
          <h3>Item dan kapster</h3>
          <Button className="secondary-button" onClick={addLine}>
            <Icon name="plus" /> Tambah baris
          </Button>
        </div>
        {lines.length === 0 && <p style={{ color: "var(--slate)" }}>Belum ada baris. Klik "Tambah baris".</p>}
        {lines.map((l, i) => (
          <div className="manual-row" key={l.key}>
            <span>{i + 1}</span>
            <select value={l.itemId} onChange={(e) => patchLine(l.key, { itemId: e.target.value })}>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                  {it.tipe === "Produk" ? " (produk)" : ""}
                </option>
              ))}
            </select>
            <select value={l.kapsterId} onChange={(e) => patchLine(l.key, { kapsterId: e.target.value })}>
              {kapster.map((k) => (
                <option key={k.id + k.nama} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <input
              min={1}
              onChange={(e) => patchLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
              type="number"
              value={l.qty}
            />
            <strong>{rupiah(priceOf(l))}</strong>
            <Button onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}>
              <Icon name="trash" />
            </Button>
          </div>
        ))}
      </section>
      <section className="panel form-panel">
        <h3>Pembayaran</h3>
        <div className="payment-form-row">
          <div className="segmented">
            {(["Tunai", "QRIS", "Gabungan"] as const).map((m) => (
              <Button className={method === m ? "active" : ""} key={m} onClick={() => setMethod(m)}>
                {m}
              </Button>
            ))}
          </div>
          {method !== "QRIS" && (
            <div className="input-shell">
              <b>Rp</b>
              <input
                inputMode="numeric"
                onChange={(e) => setCash(e.target.value)}
                placeholder={method === "Gabungan" ? "Tunai" : String(total)}
                value={cash}
              />
            </div>
          )}
          {method !== "Tunai" && (
            <div className="input-shell">
              <b>Rp</b>
              <input
                inputMode="numeric"
                onChange={(e) => setQris(e.target.value)}
                placeholder={method === "Gabungan" ? "QRIS" : String(total)}
                value={method === "QRIS" ? String(total) : qris}
                readOnly={method === "QRIS"}
              />
            </div>
          )}
          <div className="manual-total">
            <small>Total transaksi</small>
            <strong>{rupiah(total)}</strong>
          </div>
        </div>
      </section>
      <div className="sticky-submit">
        <span>
          <b>MANUAL</b> Akan ditandai di Riwayat dan laporan.
          {error && <small className="error-text"> {error}</small>}
          {success && <small> {success}</small>}
        </span>
        <Button className="primary-button" disabled={!canSave} type="submit">
          {saving ? "Menyimpan..." : "Simpan rekap manual"}
        </Button>
      </div>
    </form>
  )
}

export default ManualPage
