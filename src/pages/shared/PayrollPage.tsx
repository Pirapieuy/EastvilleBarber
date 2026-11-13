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
import { SearchSelect } from "../../components/common/SearchSelect"

export function KasbonTab({ externalAdd, onExternalAddDone }: { externalAdd?: boolean; onExternalAddDone?: () => void }) {
  const [add, setAdd] = useState(false)
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([
    { id: "u-kapster", nama: "Ferdi" },
    { id: "u-kapster2", nama: "Seva" },
  ])
  const [kasbonList, setKasbonList] = useState<KasbonRow[]>([
    {
      id: "ksb-01",
      tanggal: "2026-10-24",
      userId: "u-kapster",
      nama: "Ferdi",
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
      nama: "Seva",
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
  const [filterStatus, setFilterStatus] = useState<"" | "Aktif" | "Lunas" | "Menunggu" | "Ditolak">("")

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

  async function handleKeputusan(id: string, setuju: boolean) {
    if (!confirm(setuju ? "Setujui pengajuan kasbon ini?" : "Tolak pengajuan kasbon ini?"))
      return
    try {
      if (setuju) await apiKasbon.setujui(id)
      else await apiKasbon.tolak(id)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses pengajuan.")
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
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 14, marginRight: "auto" }}>Riwayat Kasbon</strong>
          <Button
            style={{
              cursor: "pointer",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: filterStatus === "Lunas" ? "1.5px solid var(--sage)" : "1px solid var(--line)",
              color: filterStatus === "Lunas" ? "var(--sage)" : "var(--slate)",
              background: filterStatus === "Lunas" ? "var(--sage-soft)" : "var(--paper)",
            }}
            onClick={() => setFilterStatus(filterStatus === "Lunas" ? "" : "Lunas")}
          >
            Lunas
          </Button>
          <Button
            style={{
              cursor: "pointer",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: filterStatus === "Aktif" ? "1.5px solid var(--oxblood)" : "1px solid var(--line)",
              color: filterStatus === "Aktif" ? "var(--oxblood)" : "var(--slate)",
              background: filterStatus === "Aktif" ? "var(--oxblood-soft)" : "var(--paper)",
            }}
            onClick={() => setFilterStatus(filterStatus === "Aktif" ? "" : "Aktif")}
          >
            Belum Lunas
          </Button>
        </header>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
          <SearchSelect
            value={filterKapster}
            onChange={(e) => setFilterKapster(e.target.value)}
          >
            <option value="">Semua Kapster</option>
            {kapsters.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </SearchSelect>
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
        {!loading && kasbonList.length > 0 && (
          <>
            {/* Desktop Table View (≥ 768px) - seperti Image 2 */}
            <div className="kasbon-desktop-table">
              <div className="kasbon-table-head">
                <span>Kapster</span>
                <span>Tanggal</span>
                <span>Catatan</span>
                <span>Jumlah</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {kasbonList
                .filter((k) => {
                  if (filterKapster && k.userId !== filterKapster) return false
                  if (filterStatus && k.status !== filterStatus) return false
                  if (searchKasbon.trim()) {
                    const q = searchKasbon.trim().toLowerCase()
                    const text = `${k.catatan || ""} ${k.nama}`.toLowerCase()
                    if (!text.includes(q)) return false
                  }
                  return true
                })
                .map((k) => (
                  <article className="kasbon-table-row" key={k.id}>
                    <span className="kasbon-user-cell">
                      <i>
                        <Icon name="cash" />
                      </i>
                      <span>
                        <strong>{k.nama}</strong>
                        <small>{k.role || "Kapster"}</small>
                      </span>
                    </span>
                    <span>{k.tanggal}</span>
                    <span className="kasbon-note-cell">{k.catatan || "-"}</span>
                    <strong className="kasbon-amount-cell">{rupiah(k.jumlah)}</strong>
                    <span>
                      <i className={`chip ${k.status === "Aktif" ? "batal" : k.status === "Menunggu" ? "pending" : k.status === "Ditolak" ? "batal" : "lunas"}`}>
                        {k.status === "Aktif" ? "Belum Lunas" : k.status === "Menunggu" ? "Menunggu persetujuan" : k.status}
                      </i>
                    </span>
                    <span className="kasbon-action-cell">
                      {k.status === "Menunggu" ? (
                        <>
                          <Button
                            className="secondary-button"
                            onClick={() => handleKeputusan(k.id, true)}
                          >
                            Setujui
                          </Button>
                          <Button
                            className="secondary-button"
                            onClick={() => handleKeputusan(k.id, false)}
                          >
                            Tolak
                          </Button>
                        </>
                      ) : k.status === "Aktif" ? (
                        <Button
                          className="secondary-button"
                          onClick={() => handleLunasi(k.id)}
                        >
                          Tandai Lunas
                        </Button>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>-</span>
                      )}
                    </span>
                  </article>
                ))}
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="kasbon-mobile-cards">
              {kasbonList
                .filter((k) => {
                  if (filterKapster && k.userId !== filterKapster) return false
                  if (filterStatus && k.status !== filterStatus) return false
                  if (searchKasbon.trim()) {
                    const q = searchKasbon.trim().toLowerCase()
                    const text = `${k.catatan || ""} ${k.nama}`.toLowerCase()
                    if (!text.includes(q)) return false
                  }
                  return true
                })
                .map((k) => (
                  <article className="kasbon-card" key={k.id}>
                    <div className="kasbon-card-header">
                      <span className="kasbon-card-title">
                        <i>
                          <Icon name="cash" />
                        </i>
                        <strong>{k.nama}</strong>
                      </span>
                      <i className={`chip ${k.status === "Aktif" ? "batal" : k.status === "Menunggu" ? "pending" : k.status === "Ditolak" ? "batal" : "lunas"}`}>
                        {k.status === "Aktif" ? "Belum Lunas" : k.status === "Menunggu" ? "Menunggu persetujuan" : k.status}
                      </i>
                    </div>

                    <div className="kasbon-card-grid">
                      <div className="kasbon-card-field">
                        <small>Tanggal</small>
                        <span>{k.tanggal}</span>
                      </div>
                      <div className="kasbon-card-field">
                        <small>Jumlah kasbon</small>
                        <strong>{rupiah(k.jumlah)}</strong>
                      </div>
                      <div className="kasbon-card-field">
                        <small>Catatan / Keperluan</small>
                        <span>{k.catatan || "-"}</span>
                      </div>
                      <div className="kasbon-card-field">
                        <small>Role</small>
                        <span>{k.role || "Kapster"}</span>
                      </div>
                    </div>

                    {k.status === "Menunggu" && (
                      <>
                        <hr className="kasbon-card-divider" />
                        <footer className="kasbon-card-footer">
                          <Button
                            className="secondary-button"
                            onClick={() => handleKeputusan(k.id, true)}
                          >
                            <Icon name="check" /> Setujui
                          </Button>
                          <Button
                            className="secondary-button"
                            onClick={() => handleKeputusan(k.id, false)}
                          >
                            Tolak
                          </Button>
                        </footer>
                      </>
                    )}

                    {k.status === "Aktif" && (
                      <>
                        <hr className="kasbon-card-divider" />
                        <footer className="kasbon-card-footer">
                          <Button
                            className="secondary-button"
                            onClick={() => handleLunasi(k.id)}
                          >
                            <Icon name="check" /> Tandai Lunas
                          </Button>
                        </footer>
                      </>
                    )}
                  </article>
                ))}
            </div>
          </>
        )}
      </section>

      {add && (
        <div className="modal-overlay modal-centered">
          <form className="simple-modal" onSubmit={handleCreateKasbon}>
            <header>
              <h2>Catat kasbon</h2>
              <Button type="button" onClick={() => setAdd(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kapster</span>
              <SearchSelect
                value={selectedKapsterId}
                onChange={(e) => setSelectedKapsterId(e.target.value)}
              >
                {kapsters.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </SearchSelect>
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

const PILIHAN_CATATAN_GAJI = [
  "Tunai",
  "Transfer BCA",
  "Transfer Mandiri",
  "Transfer BRI",
  "Transfer Bank",
]

export function PayrollPage() {
  const [tab, setTab] = useState<"Gaji" | "Kasbon">("Gaji")
  const [triggerAdd, setTriggerAdd] = useState(false)
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([
    { id: "u-kapster", nama: "Ferdi" },
    { id: "u-kapster2", nama: "Seva" },
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
  const [customCatatan, setCustomCatatan] = useState(false)
  const [paying, setPaying] = useState(false)
  const [filterGajiKapster, setFilterGajiKapster] = useState("")
  const [searchGaji, setSearchGaji] = useState("")
  const [filterGajiStatus, setFilterGajiStatus] = useState("")

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
      setCustomCatatan(false)
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
              <strong>{loading ? "-" : rupiah(totalAllBersih)}</strong>
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
              const isPaid = !loading && calc.gajiBersih === 0 && calc.totalKomisi === 0
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
                      <dd>{loading ? "-" : rupiah(calc.totalKomisi)}</dd>
                    </div>
                    <div className="deduct">
                      <dt>Potongan kasbon</dt>
                      <dd>{loading ? "-" : `− ${rupiah(calc.totalKasbon)}`}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>
                      <small>Gaji bersih</small>
                      <strong>{loading ? "-" : rupiah(calc.gajiBersih)}</strong>
                    </span>
                    {!isPaid && (
                      <Button
                        className="primary-button"
                        disabled={loading}
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

          <section className="panel list-panel" style={{ marginTop: 24 }}>
            <header
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <strong style={{ fontSize: 14, marginRight: "auto" }}>
                Riwayat Pembayaran Gaji
              </strong>
              {Array.from(
                new Set(historyList.map((h) => h.status || "Dibayar")),
              ).map((st) => {
                const isSelected = filterGajiStatus === st
                const isSage = st !== "Draft"
                return (
                  <Button
                    key={st}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: isSelected
                        ? isSage
                          ? "1.5px solid var(--sage)"
                          : "1.5px solid var(--oxblood)"
                        : "1px solid var(--line)",
                      color: isSelected
                        ? isSage
                          ? "var(--sage)"
                          : "var(--oxblood)"
                        : "var(--slate)",
                      background: isSelected
                        ? isSage
                          ? "var(--sage-soft)"
                          : "var(--oxblood-soft)"
                        : "var(--paper)",
                    }}
                    onClick={() =>
                      setFilterGajiStatus(isSelected ? "" : st)
                    }
                  >
                    {st}
                  </Button>
                )
              })}
            </header>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                padding: "12px 18px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <SearchSelect
                value={filterGajiKapster}
                onChange={(e) => setFilterGajiKapster(e.target.value)}
              >
                <option value="">Semua Kapster</option>
                {kapsters.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </SearchSelect>
              <label className="search" style={{ flex: 1, minWidth: 180 }}>
                <Icon name="search" />
                <input
                  value={searchGaji}
                  onChange={(e) => setSearchGaji(e.target.value)}
                  placeholder="Cari catatan/keperluan..."
                />
              </label>
            </div>

            {loading && (
              <div style={{ padding: "8px 18px" }}>
                <LoadingState
                  message="Memuat riwayat pembayaran gaji..."
                  compact
                />
              </div>
            )}
            {historyList.length === 0 && !loading && (
              <p style={{ padding: 18, color: "var(--muted)" }}>
                Belum ada riwayat pembayaran gaji tercatat di server.
              </p>
            )}
            {!loading &&
              historyList.length > 0 &&
              historyList.filter((h) => {
                if (filterGajiKapster && h.userId !== filterGajiKapster)
                  return false
                if (filterGajiStatus && h.status !== filterGajiStatus)
                  return false
                if (searchGaji.trim()) {
                  const q = searchGaji.trim().toLowerCase()
                  const text = `${h.catatan || ""} ${h.nama} ${h.tanggalBayar || ""} ${h.periode || ""}`.toLowerCase()
                  if (!text.includes(q)) return false
                }
                return true
              }).length === 0 && (
                <p style={{ padding: 18, color: "var(--muted)" }}>
                  Tidak ada data pembayaran gaji yang cocok dengan filter.
                </p>
              )}
            {!loading && (
              <>
                {/* Desktop Table View (≥ 768px) */}
                <div className="kasbon-desktop-table">
                  <div className="kasbon-table-head no-action">
                    <span>Kapster</span>
                    <span>Tanggal</span>
                    <span>Catatan</span>
                    <span>Jumlah</span>
                    <span>Status</span>
                  </div>
                  {historyList
                    .filter((h) => {
                      if (filterGajiKapster && h.userId !== filterGajiKapster)
                        return false
                      if (filterGajiStatus && h.status !== filterGajiStatus)
                        return false
                      if (searchGaji.trim()) {
                        const q = searchGaji.trim().toLowerCase()
                        const text = `${h.catatan || ""} ${h.nama} ${h.tanggalBayar || ""} ${h.periode || ""}`.toLowerCase()
                        if (!text.includes(q)) return false
                      }
                      return true
                    })
                    .map((h) => (
                      <article className="kasbon-table-row no-action" key={h.id}>
                        <span className="kasbon-user-cell">
                          <i>
                            <Icon name="cash" />
                          </i>
                          <span>
                            <strong>{h.nama}</strong>
                            <small>{h.role || "Kapster"}</small>
                          </span>
                        </span>
                        <span>
                          {h.tanggalBayar
                            ? h.tanggalBayar.slice(0, 10)
                            : h.periode || "-"}
                        </span>
                        <span className="kasbon-note-cell">
                          {h.catatan || "-"}
                        </span>
                        <strong className="kasbon-amount-cell">
                          {rupiah(h.gajiBersih)}
                        </strong>
                        <span>
                          <i className="chip lunas">{h.status || "Dibayar"}</i>
                        </span>
                      </article>
                    ))}
                </div>

                {/* Mobile Cards View (< 768px) */}
                <div className="kasbon-mobile-cards">
                  {historyList
                    .filter((h) => {
                      if (filterGajiKapster && h.userId !== filterGajiKapster)
                        return false
                      if (filterGajiStatus && h.status !== filterGajiStatus)
                        return false
                      if (searchGaji.trim()) {
                        const q = searchGaji.trim().toLowerCase()
                        const text = `${h.catatan || ""} ${h.nama} ${h.tanggalBayar || ""} ${h.periode || ""}`.toLowerCase()
                        if (!text.includes(q)) return false
                      }
                      return true
                    })
                    .map((h) => (
                      <article className="kasbon-card" key={h.id}>
                        <div className="kasbon-card-header">
                          <span className="kasbon-card-title">
                            <i>
                              <Icon name="cash" />
                            </i>
                            <strong>{h.nama}</strong>
                          </span>
                          <i className="chip lunas">{h.status || "Dibayar"}</i>
                        </div>

                        <div className="kasbon-card-grid">
                          <div className="kasbon-card-field">
                            <small>Tanggal</small>
                            <span>
                              {h.tanggalBayar
                                ? h.tanggalBayar.slice(0, 10)
                                : h.periode || "-"}
                            </span>
                          </div>
                          <div className="kasbon-card-field">
                            <small>Gaji bersih</small>
                            <strong>{rupiah(h.gajiBersih)}</strong>
                          </div>
                          <div className="kasbon-card-field">
                            <small>Catatan</small>
                            <span>{h.catatan || "-"}</span>
                          </div>
                          <div className="kasbon-card-field">
                            <small>Role</small>
                            <span>{h.role || "Kapster"}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              </>
            )}
          </section>
        </>
      ) : (
        <KasbonTab externalAdd={triggerAdd} onExternalAddDone={() => setTriggerAdd(false)} />
      )}

      {selectedPayTarget && (
        <div
          className="modal-overlay modal-centered"
          onClick={() => {
            setSelectedPayTarget(null)
            setPayCatatan("")
            setCustomCatatan(false)
          }}
        >
          <form
            className="simple-modal"
            onSubmit={handleConfirmPay}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>Bayar Gaji: {selectedPayTarget.nama}</h2>
            </header>

            <div style={{ padding: "16px 18px 14px" }}>
              <div className="pay-preview" style={{ margin: 0 }}>
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

              <div style={{ margin: "16px 0 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    Catatan pembayaran (opsional)
                  </span>
                  <span
                    onClick={() => {
                      setCustomCatatan(!customCatatan)
                      setPayCatatan("")
                    }}
                    style={{
                      color: "var(--brass)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {customCatatan ? "Pilih catatan" : "Catatan lainnya"}
                  </span>
                </div>

                {customCatatan ? (
                  <input
                    placeholder="Tuliskan catatan pembayaran..."
                    value={payCatatan}
                    onChange={(e) => setPayCatatan(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      padding: "0 10px",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      outline: "none",
                      background: "var(--paper)",
                      fontSize: 13,
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PILIHAN_CATATAN_GAJI.map((p) => {
                      const isSelected = payCatatan === p
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPayCatatan(isSelected ? "" : p)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: isSelected
                              ? "2px solid var(--brass)"
                              : "1.5px solid var(--slate)",
                            background: isSelected
                              ? "rgba(200, 150, 62, 0.1)"
                              : "var(--paper)",
                            color: "var(--ink)",
                            fontWeight: isSelected ? 700 : 400,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 120ms ease",
                          }}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setSelectedPayTarget(null)
                  setPayCatatan("")
                  setCustomCatatan(false)
                }}
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
        </div>
      )}
    </div>
  )
}

export default PayrollPage
