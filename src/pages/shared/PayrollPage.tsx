import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  LoadingState,
  PageTitle,
  rupiah,
} from "../../components/common/UI"
import {
  apiKasbon,
  apiGaji,
  apiKasir,
  getToken,
  KasbonRow,
  GajiRow,
  HitungGajiResult,
} from "../../api"

export function KasbonTab({ externalAdd, onExternalAddDone }: { externalAdd?: boolean; onExternalAddDone?: () => void }) {
  const [add, setAdd] = useState(false)
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([
    { id: "u-kapster", nama: "Budi Santoso" },
    { id: "u-kapster2", nama: "Zhefitra Ananda" },
  ])
  const [kasbonList, setKasbonList] = useState<KasbonRow[]>([
    {
      id: "ksb-01",
      tanggal: "2026-10-24",
      userId: "u-kapster",
      nama: "Budi Santoso",
      role: "Kapster",
      jumlah: 350000,
      status: "Aktif",
      catatan: "Keperluan keluarga",
      dibuatOleh: "Ardi Pradana",
    },
    {
      id: "ksb-02",
      tanggal: "2026-10-20",
      userId: "u-kapster2",
      nama: "Zhefitra Ananda",
      role: "Kapster",
      jumlah: 500000,
      status: "Aktif",
      catatan: "Perbaikan kendaraan",
      dibuatOleh: "Ardi Pradana",
    },
  ])
  const [loading, setLoading] = useState(false)

  // Form input
  const [selectedKapsterId, setSelectedKapsterId] = useState("")
  const [jumlah, setJumlah] = useState("")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)
  const [filterKapster, setFilterKapster] = useState("")
  const [searchKasbon, setSearchKasbon] = useState("")

  useEffect(() => {
    if (externalAdd) {
      if (kapsters.length > 0) setSelectedKapsterId(kapsters[0].id)
      setAdd(true)
      onExternalAddDone?.()
    }
  }, [externalAdd])

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [kaps, list] = await Promise.all([
        apiKasir.kapster().catch(() => []),
        apiKasbon.list().catch(() => []),
      ])
      if (kaps.length > 0) setKapsters(kaps)
      setKasbonList(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreateKasbon(e: React.FormEvent) {
    e.preventDefault()
    const target =
      kapsters.find((k) => k.id === selectedKapsterId) || kapsters[0]
    if (!target) return
    setSaving(true)
    try {
      await apiKasbon.create({
        userId: target.id,
        nama: target.nama,
        role: "Kapster",
        jumlah: Number(jumlah),
        catatan: catatan.trim(),
      })
      alert("Kasbon berhasil dicatat.")
      setAdd(false)
      setCatatan("")
      setJumlah("")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mencatat kasbon.")
    } finally {
      setSaving(false)
    }
  }

  async function handleLunasi(id: string) {
    if (confirm("Tandai kasbon ini sudah lunas?")) {
      try {
        await apiKasbon.lunasi(id)
        loadData()
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal melunasi kasbon.")
      }
    }
  }

  // Ringkasan per kapster
  const ringkasanMap: Record<string, { nama: string; total: number }> = {}
  kapsters.forEach((k) => {
    ringkasanMap[k.id] = { nama: k.nama, total: 0 }
  })
  kasbonList.forEach((k) => {
    if (k.status === "Aktif") {
      if (!ringkasanMap[k.userId]) {
        ringkasanMap[k.userId] = { nama: k.nama, total: 0 }
      }
      ringkasanMap[k.userId].total += k.jumlah
    }
  })

  return (
    <>
      <PageTitle
        eyebrow="Saldo berjalan"
        title="Kasbon kapster"
      />

      <div className="advance-grid" style={{ gridTemplateColumns: `repeat(${Object.keys(ringkasanMap).length || 2}, 1fr)` }}>
        {!loading &&
          Object.entries(ringkasanMap).map(([uid, x]) => (
          <article key={uid}>
            <span>{x.nama.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{x.nama}</strong>
              <small>Sisa kasbon aktif</small>
              <b>{rupiah(x.total)}</b>
            </div>
          </article>
        ))}
      </div>

      <section className="panel list-panel">
        <header
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <strong style={{ fontSize: 14 }}>Riwayat Kasbon</strong>
        </header>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 18px" }}>
          <select
            value={filterKapster}
            onChange={(e) => setFilterKapster(e.target.value)}
            style={{
              padding: "8px 12px",
              paddingRight: 24,
              borderRadius: 8,
              border: "1.5px solid var(--slate)",
              background: "var(--paper)",
              fontSize: 13,
              minWidth: 140,
              appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b645c' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">Semua Kapster</option>
            {kapsters.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
          <label className="search" style={{ flex: 1, minWidth: 180 }}>
            <Icon name="search" />
            <input
              value={searchKasbon}
              onChange={(e) => setSearchKasbon(e.target.value)}
              placeholder="Cari catatan/keperluan..."
            />
          </label>
        </div>
        {loading && (
          <div style={{ padding: "8px 18px" }}>
            <LoadingState message="Memuat data kasbon..." compact />
          </div>
        )}
        {kasbonList.length === 0 && !loading && (
          <p style={{ padding: 18, color: "var(--muted)" }}>
            Belum ada catatan kasbon.
          </p>
        )}
        {!loading && kasbonList
          .filter((k) => {
            if (filterKapster && k.userId !== filterKapster) return false
            if (searchKasbon.trim()) {
              const q = searchKasbon.trim().toLowerCase()
              const text = `${k.catatan || ""} ${k.nama}`.toLowerCase()
              if (!text.includes(q)) return false
            }
            return true
          })
          .map((k) => (
          <div className="advance-row" key={k.id}>
            <strong>{k.nama}</strong>
            <span>{k.tanggal}</span>
            <span>{k.catatan || "Kasbon"}</span>
            <b>{rupiah(k.jumlah)}</b>
            <i className={`chip ${k.status === "Aktif" ? "lunas" : "manual"}`}>
              {k.status}
            </i>
            {k.status === "Aktif" && (
              <Button
                className="danger-link"
                onClick={() => handleLunasi(k.id)}
              >
                Tandai Lunas
              </Button>
            )}
          </div>
        ))}
      </section>

      {add && (
        <div className="modal-overlay">
          <form className="simple-modal" onSubmit={handleCreateKasbon}>
            <header>
              <h2>Catat kasbon</h2>
              <Button type="button" onClick={() => setAdd(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kapster</span>
              <select
                value={selectedKapsterId}
                onChange={(e) => setSelectedKapsterId(e.target.value)}
              >
                {kapsters.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Jumlah kasbon</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  type="number"
                  min={10000}
                  step={10000}
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </label>
            <label>
              <span>Catatan / Keperluan</span>
              <textarea
                placeholder="Contoh: Keperluan keluarga, beli sparepart..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                required
              />
            </label>
            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setAdd(false)}
              >
                Batal
              </Button>
              <Button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </>
  )
}

export function PayrollPage() {
  const [tab, setTab] = useState<"Gaji" | "Kasbon">("Gaji")
  const [triggerAdd, setTriggerAdd] = useState(false)
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([
    { id: "u-kapster", nama: "Budi Santoso" },
    { id: "u-kapster2", nama: "Zhefitra Ananda" },
  ])
  const [salaryMap, setSalaryMap] = useState<Record<string, HitungGajiResult>>(
    {},
  )
  const [historyList, setHistoryList] = useState<GajiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPayTarget, setSelectedPayTarget] = useState<{
    id: string
    nama: string
  } | null>(null)
  const [payCatatan, setPayCatatan] = useState("")
  const [paying, setPaying] = useState(false)

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [kaps, hist] = await Promise.all([
        apiKasir.kapster().catch(() => []),
        apiGaji.list().catch(() => []),
      ])
      if (kaps.length > 0) {
        setKapsters(kaps)
        const calcEntries = await Promise.all(
          kaps.map(async (k) => {
            try {
              const res = await apiGaji.hitung(k.id)
              return [k.id, res] as const
            } catch {
              const fallback: HitungGajiResult = {
                userId: k.id,
                totalKomisi: 1400000,
                totalKasbon: 350000,
                gajiBersih: 1050000,
                transaksiSelesai: 28,
                kasbonAktif: [],
              }
              return [k.id, fallback] as const
            }
          }),
        )
        const sm: Record<string, HitungGajiResult> = {}
        calcEntries.forEach(([id, val]) => {
          sm[id] = val
        })
        setSalaryMap(sm)
      }
      setHistoryList(hist)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === "Gaji") loadData()
  }, [tab])

  async function handleConfirmPay(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPayTarget) return
    const calc = salaryMap[selectedPayTarget.id]
    if (!calc) return

    setPaying(true)
    try {
      await apiGaji.bayar({
        userId: selectedPayTarget.id,
        nama: selectedPayTarget.nama,
        role: "Kapster",
        totalKomisi: calc.totalKomisi,
        totalKasbon: calc.totalKasbon,
        gajiBersih: calc.gajiBersih,
        catatan: payCatatan.trim(),
      })
      alert(`Pembayaran gaji untuk ${selectedPayTarget.nama} berhasil dicatat!`)
      setSelectedPayTarget(null)
      setPayCatatan("")
      loadData()
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Gagal memproses pembayaran gaji.",
      )
    } finally {
      setPaying(false)
    }
  }

  const totalAllBersih = Object.values(salaryMap).reduce(
    (a, b) => a + b.gajiBersih,
    0,
  )

  return (
    <div className="content">
      <div className="payroll-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
        <div className="segmented payroll-segment">
          <Button
            className={tab === "Gaji" ? "active" : ""}
            onClick={() => setTab("Gaji")}
          >
            Gaji
          </Button>
          <Button
            className={tab === "Kasbon" ? "active" : ""}
            onClick={() => setTab("Kasbon")}
          >
            Kasbon
          </Button>
        </div>
        {tab === "Kasbon" && (
          <Button
            className="primary-button"
            onClick={() => setTriggerAdd(true)}
          >
            <Icon name="plus" /> Catat kasbon
          </Button>
        )}
      </div>

      {tab === "Gaji" ? (
        <>
          <section className="salary-hero">
            <div>
              <p className="eyebrow">Periode pembayaran</p>
              <h2>Periode Berjalan (Live)</h2>
            </div>
            <div>
              <small>Total estimasi gaji bersih</small>
              <strong>{rupiah(totalAllBersih)}</strong>
              <small>{kapsters.length} kapster terdaftar</small>
            </div>
          </section>

          {loading && (
            <LoadingState
              message="Menghitung komisi..."
              compact
            />
          )}

          <div className="salary-grid">
            {kapsters.map((k) => {
              const calc = salaryMap[k.id] || {
                userId: k.id,
                totalKomisi: 0,
                totalKasbon: 0,
                gajiBersih: 0,
                transaksiSelesai: 0,
                kasbonAktif: [],
              }
              const isPaid = calc.gajiBersih === 0 && calc.totalKomisi === 0
              return (
                <article className="salary-card" key={k.id}>
                  <header>
                    <span>{k.nama.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <h3>{k.nama}</h3>
                      <small>{calc.transaksiSelesai} transaksi selesai</small>
                    </div>
                    <i className={`chip ${isPaid ? "lunas" : "manual"}`}>
                      {isPaid ? "Lunas" : "Belum dibayar"}
                    </i>
                  </header>
                  <dl>
                    <div>
                      <dt>Total komisi berjalan</dt>
                      <dd>{rupiah(calc.totalKomisi)}</dd>
                    </div>
                    <div className="deduct">
                      <dt>Potongan kasbon</dt>
                      <dd>− {rupiah(calc.totalKasbon)}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>
                      <small>Gaji bersih</small>
                      <strong>{rupiah(calc.gajiBersih)}</strong>
                    </span>
                    {!isPaid && (
                      <Button
                        className="primary-button"
                        onClick={() => setSelectedPayTarget(k)}
                      >
                        Bayar
                      </Button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>

          <section className="panel history-panel" style={{ marginTop: 24 }}>
            <PageTitle
              eyebrow="Jejak pembayaran"
              title="Riwayat pembayaran gaji"
            />
            {historyList.length === 0 ? (
              <p style={{ padding: 18, color: "var(--muted)" }}>
                Belum ada riwayat pembayaran gaji tercatat di server.
              </p>
            ) : (
              historyList.map((h) => (
                <div className="history-payment" key={h.id}>
                  <span>{h.nama.slice(0, 2).toUpperCase()}</span>
                  <strong>{h.nama}</strong>
                  <span>{h.tanggalBayar}</span>
                  <b>{rupiah(h.gajiBersih)}</b>
                  <i className="chip lunas">{h.status}</i>
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <KasbonTab externalAdd={triggerAdd} onExternalAddDone={() => setTriggerAdd(false)} />
      )}

      {selectedPayTarget && (
        <div className="modal-overlay">
          <section className="simple-modal">
            <header>
              <h2>Bayar Gaji: {selectedPayTarget.nama}</h2>
              <Button type="button" onClick={() => setSelectedPayTarget(null)}>
                <Icon name="close" />
              </Button>
            </header>
            <form onSubmit={handleConfirmPay}>
              <div className="pay-preview">
                <div>
                  <span>Total komisi layanan & produk</span>
                  <strong>
                    {rupiah(salaryMap[selectedPayTarget.id]?.totalKomisi || 0)}
                  </strong>
                </div>
                <div>
                  <span>Potongan kasbon aktif</span>
                  <strong>
                    −{" "}
                    {rupiah(salaryMap[selectedPayTarget.id]?.totalKasbon || 0)}
                  </strong>
                </div>
                <div>
                  <span>Gaji bersih yang dibayarkan</span>
                  <strong style={{ color: "var(--brass-dark)" }}>
                    {rupiah(salaryMap[selectedPayTarget.id]?.gajiBersih || 0)}
                  </strong>
                </div>
              </div>

              <label style={{ margin: "14px 0", display: "block" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Catatan pembayaran (opsional)
                </span>
                <input
                  placeholder="Misal: Transfer BCA, Tunai..."
                  value={payCatatan}
                  onChange={(e) => setPayCatatan(e.target.value)}
                />
              </label>

              <footer>
                <Button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSelectedPayTarget(null)}
                >
                  Batal
                </Button>
                <Button
                  className="primary-button"
                  type="submit"
                  disabled={paying}
                >
                  {paying ? "Memproses..." : "Konfirmasi Pembayaran"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default PayrollPage
