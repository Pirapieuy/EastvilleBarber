import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  ErrorState,
  LoadingState,
  rupiah,
} from "../../components/common/UI"
import {
  apiKasbon,
  apiGaji,
  apiKasir,
  KasbonRow,
  GajiRow,
  HitungGajiResult,
} from "../../api"
import { SearchSelect } from "../../components/common/SearchSelect"
import { ConfirmModal } from "../../components/common/ConfirmModal"
import { formatTanggal, labelRentang, rentangPeriode, usePeriodeTersimpan } from "../../utils/tanggal"
import { PeriodePicker } from "../../components/common/PeriodePicker"
import { ExportModal } from "../../components/common/ExportModal"
import { dokumenGaji, dokumenKasbon } from "../../utils/dokumenEkspor"

type Kapster = { id: string; nama: string }
type Data = {
  kapsters: Kapster[]
  hitung: Record<string, HitungGajiResult>
  gaji: GajiRow[]
  kasbon: KasbonRow[]
}
type KasbonAktif = HitungGajiResult["kasbonAktif"][number]

const CATATAN_GAJI = [
  "Tunai",
  "Transfer BCA",
  "Transfer Mandiri",
  "Transfer BRI",
  "Transfer Bank",
]

const STATUS_KASBON = {
  Aktif: { label: "Belum lunas", chip: "batal" },
  Menunggu: { label: "Menunggu", chip: "pending" },
  Lunas: { label: "Lunas", chip: "lunas" },
  Ditolak: { label: "Ditolak", chip: "manual" },
} as const

/** Kasbon yang otomatis dipotong: terlama dulu, selama total tidak melebihi komisi. */
function pilihOtomatis(kasbon: KasbonAktif[], komisi: number) {
  const ids: string[] = []
  let sisa = komisi
  for (const k of [...kasbon].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
    if (k.jumlah <= sisa) {
      ids.push(k.id)
      sisa -= k.jumlah
    }
  }
  return ids
}

const URUTAN_STATUS: Record<string, number> = { Menunggu: 0, Aktif: 1, Lunas: 2, Ditolak: 3 }

function urutkan<T>(
  list: T[],
  urut: string,
  tgl: (x: T) => string,
  jml: (x: T) => number,
  status?: (x: T) => string,
) {
  const a = [...list]
  if (urut === "status")
    return a.sort(
      (x, y) =>
        (URUTAN_STATUS[status?.(x) ?? ""] ?? 9) - (URUTAN_STATUS[status?.(y) ?? ""] ?? 9) ||
        tgl(y).localeCompare(tgl(x)),
    )
  if (urut === "terlama") a.reverse()
  if (urut === "terbesar") return a.sort((x, y) => jml(y) - jml(x))
  if (urut === "terkecil") return a.sort((x, y) => jml(x) - jml(y))
  return a.sort((x, y) =>
    urut === "terlama" ? tgl(x).localeCompare(tgl(y)) : tgl(y).localeCompare(tgl(x)),
  )
}

const tanggalGaji = (g: GajiRow) => (g.tanggalBayar || "").slice(0, 10)

function bukaDenganKeyboard(e: React.KeyboardEvent, aksi: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    aksi()
  }
}

export function PayrollPage() {
  const [tab, setTab] = useState<"Gaji" | "Kasbon">("Gaji")
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [fetching, setFetching] = useState(false)
  const [reload, setReload] = useState(0)
  const [eksporBuka, setEksporBuka] = useState(false)

  // Riwayat Gaji
  const [gCari, setGCari] = useState("")
  const [gKapster, setGKapster] = useState("")
  const [gUrut, setGUrut] = useState("terbaru")
  const [gPeriode, setGMode, setGTanggal] = usePeriodeTersimpan("gaji")
  const [gBuka, setGBuka] = useState<string | null>(null)

  // Riwayat Kasbon
  const [kCari, setKCari] = useState("")
  const [kKapster, setKKapster] = useState("")
  const [kStatus, setKStatus] = useState("")
  const [kUrut, setKUrut] = useState("status")
  const [kPeriode, setKMode, setKTanggal] = usePeriodeTersimpan("kasbon")

  // Popup bayar gaji
  const [bayarKapster, setBayarKapster] = useState<Kapster | null>(null)
  const [pilih, setPilih] = useState<string[]>([])
  const [catatanBayar, setCatatanBayar] = useState("")
  const [catatanLain, setCatatanLain] = useState(false)
  const [paying, setPaying] = useState(false)
  const [bayarError, setBayarError] = useState("")

  // Popup catat kasbon
  const [tambahOpen, setTambahOpen] = useState(false)
  const [tKapster, setTKapster] = useState("")
  const [tJumlah, setTJumlah] = useState("")
  const [tCatatan, setTCatatan] = useState("")
  const [saving, setSaving] = useState(false)
  const [tambahError, setTambahError] = useState("")

  const [konfirmasi, setKonfirmasi] = useState<{
    type: "lunasi" | "setujui" | "tolak"
    item: KasbonRow
  } | null>(null)

  useEffect(() => {
    let batal = false
    setFetching(true)
    ;(async () => {
      try {
        const [kapsters, kasbon, gaji] = await Promise.all([
          apiKasir.kapster(),
          apiKasbon.list(),
          apiGaji.list(),
        ])
        const entri = await Promise.all(
          kapsters.map(async (k) => [k.id, await apiGaji.hitung(k.id)] as const),
        )
        if (batal) return
        setData({ kapsters, kasbon, gaji, hitung: Object.fromEntries(entri) })
        setError("")
      } catch (e) {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat data.")
      } finally {
        if (!batal) setFetching(false)
      }
    })()
    return () => {
      batal = true
    }
  }, [reload])

  // Periode komisi tiap pembayaran = dari pembayaran sebelumnya (kapster sama) sampai tanggal ini.
  const periodeGaji = useMemo(() => {
    const out: Record<string, string> = {}
    if (!data) return out
    data.gaji.forEach((g, i) => {
      const akhir = tanggalGaji(g)
      const sebelum = data.gaji.slice(i + 1).find((x) => x.userId === g.userId)
      const awal = sebelum ? tanggalGaji(sebelum) : ""
      out[g.id] = !akhir
        ? g.periode || "-"
        : !awal
          ? `Awal - ${formatTanggal(akhir)}`
          : awal === akhir
            ? formatTanggal(akhir)
            : labelRentang(awal, akhir)
    })
    return out
  }, [data])

  if (error) {
    return (
      <div className="content">
        <ErrorState
          title="Gaji & Kasbon gagal dimuat"
          message={error}
          onRetry={() => {
            setError("")
            setReload((k) => k + 1)
          }}
        />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="content">
        <LoadingState message="Memuat gaji & kasbon..." />
      </div>
    )
  }

  const { kapsters, hitung, gaji, kasbon } = data
  const namaKapster = (id: string) => kapsters.find((k) => k.id === id)?.nama ?? ""

  // ---------- Gaji ----------
  const kartuGaji = kapsters.map((k) => {
    const c = hitung[k.id]
    const dipotong = pilihOtomatis(c.kasbonAktif, c.totalKomisi)
    const potongan = c.kasbonAktif
      .filter((x) => dipotong.includes(x.id))
      .reduce((a, x) => a + x.jumlah, 0)
    const totalAktif = c.kasbonAktif.reduce((a, x) => a + x.jumlah, 0)
    const terakhir = gaji
      .filter((g) => g.userId === k.id && tanggalGaji(g))
      .map(tanggalGaji)
      .sort()
      .pop()
    return { k, c, potongan, totalAktif, sisaKasbon: totalAktif - potongan, bersih: c.totalKomisi - potongan, terakhir }
  }).sort((a, b) => Number(b.c.totalKomisi > 0) - Number(a.c.totalKomisi > 0) || b.c.totalKomisi - a.c.totalKomisi)

  const riwayatGaji = urutkan(
    gaji.filter((g) => {
      if (gKapster && g.userId !== gKapster) return false
      if (gPeriode.tanggal) {
        const r = rentangPeriode(gPeriode.mode, gPeriode.tanggal)
        const t = tanggalGaji(g)
        if (t < r.dari || t > r.sampai) return false
      }
      const q = gCari.trim().toLowerCase()
      if (!q) return true
      return `${g.nama} ${g.catatan} ${periodeGaji[g.id] ?? ""}`.toLowerCase().includes(q)
    }),
    gUrut,
    tanggalGaji,
    (g) => g.gajiBersih,
  )

  function bukaBayar(k: Kapster) {
    const c = hitung[k.id]
    setBayarKapster(k)
    setPilih(pilihOtomatis(c.kasbonAktif, c.totalKomisi))
    setCatatanBayar("")
    setCatatanLain(false)
    setBayarError("")
  }

  function tutupBayar() {
    if (paying) return
    setBayarKapster(null)
  }

  async function handleBayar(e: React.FormEvent) {
    e.preventDefault()
    if (!bayarKapster) return
    const c = hitung[bayarKapster.id]
    const potongan = c.kasbonAktif
      .filter((x) => pilih.includes(x.id))
      .reduce((a, x) => a + x.jumlah, 0)
    if (potongan > c.totalKomisi) return
    setPaying(true)
    setBayarError("")
    try {
      await apiGaji.bayar({
        userId: bayarKapster.id,
        nama: bayarKapster.nama,
        role: "Kapster",
        totalKomisi: c.totalKomisi,
        totalKasbon: potongan,
        gajiBersih: c.totalKomisi - potongan,
        catatan: catatanBayar.trim(),
        kasbonIds: pilih,
      })
      setBayarKapster(null)
      setReload((k) => k + 1)
    } catch (err) {
      setBayarError(err instanceof Error ? err.message : "Gagal memproses pembayaran gaji.")
    } finally {
      setPaying(false)
    }
  }

  // ---------- Kasbon ----------
  const kasbonAktif = kasbon.filter((k) => k.status === "Aktif")
  const kasbonMenunggu = kasbon.filter((k) => k.status === "Menunggu")
  const kasbonLunas = kasbon.filter((k) => k.status === "Lunas")
  const sum = (l: KasbonRow[]) => l.reduce((a, k) => a + k.jumlah, 0)

  const riwayatKasbon = urutkan(
    kasbon.filter((k) => {
      if (kKapster && k.userId !== kKapster) return false
      if (kStatus && k.status !== kStatus) return false
      if (kPeriode.tanggal) {
        const r = rentangPeriode(kPeriode.mode, kPeriode.tanggal)
        if (k.tanggal < r.dari || k.tanggal > r.sampai) return false
      }
      const q = kCari.trim().toLowerCase()
      if (!q) return true
      return `${k.nama} ${k.catatan}`.toLowerCase().includes(q)
    }),
    kUrut,
    (k) => k.tanggal,
    (k) => k.jumlah,
    (k) => k.status,
  )

  function bukaTambah() {
    setTKapster(kapsters[0]?.id ?? "")
    setTJumlah("")
    setTCatatan("")
    setTambahError("")
    setTambahOpen(true)
  }

  async function handleTambah(e: React.FormEvent) {
    e.preventDefault()
    const target = kapsters.find((k) => k.id === tKapster)
    if (!target) return
    setSaving(true)
    setTambahError("")
    try {
      await apiKasbon.create({
        userId: target.id,
        nama: target.nama,
        role: "Kapster",
        jumlah: Number(tJumlah),
        catatan: tCatatan.trim(),
      })
      setTambahOpen(false)
      setReload((k) => k + 1)
    } catch (err) {
      setTambahError(err instanceof Error ? err.message : "Gagal mencatat kasbon.")
    } finally {
      setSaving(false)
    }
  }

  async function handleKonfirmasi() {
    if (!konfirmasi) return
    const { type, item } = konfirmasi
    if (type === "lunasi") await apiKasbon.lunasi(item.id)
    else if (type === "setujui") await apiKasbon.setujui(item.id)
    else await apiKasbon.tolak(item.id)
    setReload((k) => k + 1)
  }

  const kpiKasbon = [
    { key: "Aktif", icon: "wallet", tone: "amber", label: "Belum lunas", value: sum(kasbonAktif), detail: `${kasbonAktif.length} kasbon` },
    { key: "Menunggu", icon: "clock", tone: "brass", label: "Menunggu", value: sum(kasbonMenunggu), detail: `${kasbonMenunggu.length} pengajuan` },
    { key: "Lunas", icon: "check", tone: "sage", label: "Sudah lunas", value: sum(kasbonLunas), detail: `${kasbonLunas.length} kasbon` },
  ] as const


  const potonganPopup = bayarKapster
    ? hitung[bayarKapster.id].kasbonAktif
        .filter((x) => pilih.includes(x.id))
        .reduce((a, x) => a + x.jumlah, 0)
    : 0
  const komisiPopup = bayarKapster ? hitung[bayarKapster.id].totalKomisi : 0
  const kelebihan = potonganPopup > komisiPopup
  const kasbonPopup = bayarKapster ? hitung[bayarKapster.id].kasbonAktif : []
  // Bila ada kasbon yang masih muat dipotong, minimal satu wajib dicentang.
  const wajibCentang =
    pilih.length === 0 && kasbonPopup.some((x) => x.jumlah <= komisiPopup)

  return (
    <div className="content report-page gaji-page" style={fetching ? { opacity: 0.85 } : undefined}>
      <div className="gj-top">
        <div className="segmented gj-tabs">
          <Button className={tab === "Gaji" ? "active" : ""} onClick={() => setTab("Gaji")}>
            <Icon name="wallet" /> Gaji
          </Button>
          <Button className={tab === "Kasbon" ? "active" : ""} onClick={() => setTab("Kasbon")}>
            <Icon name="cash" /> Kasbon
          </Button>
        </div>
        <Button className="secondary-button gj-ekspor" onClick={() => setEksporBuka(true)}>
          <Icon name="download" /> Ekspor
        </Button>
      </div>

      {tab === "Kasbon" && (
      <div className="od-kpis">
        {kpiKasbon.map((k) => {
          const isi = (
            <span className="od-kpi-body">
              <span className={`kpi-icon ${k.tone}`}>
                <Icon name={k.icon} />
              </span>
              <span className="od-kpi-text">
                <span className="od-kpi-label">{k.label}</span>
                <strong className="od-kpi-value">
                  {rupiah(k.value)}
                </strong>
                <span className="od-kpi-detail">{k.detail}</span>
              </span>
            </span>
          )
          return (
            <button
              key={k.key}
              type="button"
              className={`od-kpi${kStatus === k.key ? " is-active" : ""}`}
              onClick={() => setKStatus(kStatus === k.key ? "" : k.key)}
            >
              {isi}
            </button>
          )
        })}
      </div>
      )}

      {tab === "Gaji" ? (
        <>
          <section className="panel lk-panel gj-top-panel">
            <div className="lk-head">
              <h3>Gaji periode berjalan</h3>
            </div>
            <div className="gj-cards">
              {kartuGaji.map(({ k, c, potongan, sisaKasbon, bersih, terakhir }) => {
                const adaKomisi = c.totalKomisi > 0
                return (
                  <article className="gj-card" key={k.id}>
                    <header>
                      <div>
                        <h4>{k.nama}</h4>
                        <small>
                          Komisi sejak {terakhir ? formatTanggal(terakhir) : "awal"} · {c.transaksiSelesai} transaksi
                        </small>
                      </div>
                      <i className={`chip ${adaKomisi ? "pending" : terakhir ? "lunas" : "manual"}`}>
                        {adaKomisi ? "Belum dibayar" : terakhir ? "Sudah dibayar" : "Belum ada komisi"}
                      </i>
                    </header>
                    <dl>
                      <div>
                        <dt>Komisi</dt>
                        <dd>{rupiah(c.totalKomisi)}</dd>
                      </div>
                      <div className="deduct">
                        <dt>Potong kasbon</dt>
                        <dd>{potongan > 0 ? `− ${rupiah(potongan)}` : rupiah(0)}</dd>
                      </div>
                      {sisaKasbon > 0 && (
                        <div className="carry">
                          <dt>Kasbon dibawa ke gaji berikutnya</dt>
                          <dd>{rupiah(sisaKasbon)}</dd>
                        </div>
                      )}
                    </dl>
                    <footer>
                      <span>
                        <small>Gaji bersih</small>
                        <strong>{rupiah(bersih)}</strong>
                      </span>
                      <Button
                        className="primary-button"
                        disabled={!adaKomisi}
                        onClick={() => bukaBayar(k)}
                      >
                        Bayar gaji
                      </Button>
                    </footer>
                  </article>
                )
              })}
              {kartuGaji.length === 0 && <div className="lk-empty">Belum ada kapster aktif.</div>}
            </div>
          </section>

          <section className="panel lk-panel gj-fill">
            <div className="lk-head">
              <h3>Riwayat pembayaran gaji</h3>
              <small className="gj-count">{riwayatGaji.length} pembayaran</small>
            </div>
            <div className="gj-filters">
              <div className="gj-search-row">
                <label className="search">
                  <Icon name="search" />
                  <input
                    value={gCari}
                    onChange={(e) => setGCari(e.target.value)}
                    placeholder="Cari kapster atau catatan..."
                  />
                </label>
              </div>
              <div className="gj-filter-grid">
                <SearchSelect value={gKapster} onChange={(e) => setGKapster(e.target.value)}>
                  <option value="">Semua kapster</option>
                  {kapsters.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </SearchSelect>
                <SearchSelect value={gUrut} onChange={(e) => setGUrut(e.target.value)}>
                  <option value="terbaru">Tanggal terbaru</option>
                  <option value="terlama">Tanggal terlama</option>
                  <option value="terbesar">Gaji terbesar</option>
                  <option value="terkecil">Gaji terkecil</option>
                </SearchSelect>
                <PeriodePicker periode={gPeriode} onMode={setGMode} onTanggal={setGTanggal} />
              </div>
            </div>
            <div className="gj-table gj-gaji">
              <div className="gj-head">
                <span>Kapster</span>
                <span>Periode komisi</span>
                <span>Dibayar</span>
                <span className="r">Komisi</span>
                <span className="r">Kasbon</span>
                <span className="r">Gaji bersih</span>
                <span />
              </div>
              {riwayatGaji.map((g) => {
                const buka = gBuka === g.id
                const terpotong = kasbon.filter((k) => k.gajiId === g.id)
                return (
                  <div className={`gj-item${buka ? " open" : ""}`} key={g.id}>
                    <div
                      className="gj-row"
                      role="button"
                      tabIndex={0}
                      aria-expanded={buka}
                      onClick={() => setGBuka(buka ? null : g.id)}
                      onKeyDown={(e) => bukaDenganKeyboard(e, () => setGBuka(buka ? null : g.id))}
                    >
                      <span className="gj-main">
                        <strong>{g.nama}</strong>
                      </span>
                      <span data-l="Periode komisi">{periodeGaji[g.id]}</span>
                      <span data-l="Dibayar">{tanggalGaji(g) ? formatTanggal(tanggalGaji(g)) : "-"}</span>
                      <span className="r" data-l="Komisi">{rupiah(g.totalKomisi)}</span>
                      <span className="r" data-l="Kasbon">{g.totalKasbon > 0 ? `− ${rupiah(g.totalKasbon)}` : "-"}</span>
                      <strong className="r" data-l="Gaji bersih">{rupiah(g.gajiBersih)}</strong>
                      <span className="gj-chev"><Icon name="chevron" /></span>
                    </div>
                    {buka && (
                      <div className="gj-detail">
                        <dl>
                          <div><dt>Dibayar oleh</dt><dd>{g.dibayarOleh || "-"}</dd></div>
                          <div><dt>Catatan</dt><dd>{g.catatan || "-"}</dd></div>
                        </dl>
                        <div className="gj-detail-kasbon">
                          <strong>Kasbon yang dipotong</strong>
                          {terpotong.length > 0 ? (
                            terpotong.map((k) => (
                              <p key={k.id}>
                                <span>{formatTanggal(k.tanggal)} · {k.catatan || "Tanpa catatan"}</span>
                                <b>{rupiah(k.jumlah)}</b>
                              </p>
                            ))
                          ) : g.totalKasbon > 0 ? (
                            <p>
                              <span>Rincian tidak tersimpan (dibayar sebelum fitur ini)</span>
                              <b>{rupiah(g.totalKasbon)}</b>
                            </p>
                          ) : (
                            <p><span>Tanpa potongan kasbon</span></p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {riwayatGaji.length === 0 && (
                <div className="lk-empty">
                  {gaji.length === 0 ? "Belum ada pembayaran gaji." : "Tidak ada pembayaran yang cocok."}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel lk-panel gj-top-panel">
            <div className="lk-head">
              <h3>Kasbon belum lunas per kapster</h3>
            </div>
            <div className="gj-cards">
              {kapsters.filter((k) => kasbonAktif.some((x) => x.userId === k.id)).map((k) => {
                const list = kasbonAktif.filter((x) => x.userId === k.id)
                const total = sum(list)
                return (
                  <button
                    type="button"
                    className={`gj-card mini${kKapster === k.id ? " is-active" : ""}`}
                    key={k.id}
                    onClick={() => setKKapster(kKapster === k.id ? "" : k.id)}
                  >
                    <h4>{k.nama}</h4>
                    <strong>{rupiah(total)}</strong>
                    <small>{list.length} kasbon belum lunas</small>
                  </button>
                )
              })}
              {kasbonAktif.length === 0 && <div className="lk-empty">Tidak ada kasbon yang belum lunas.</div>}
            </div>
          </section>

          <section className="panel lk-panel gj-fill">
            <div className="lk-head">
              <h3>Riwayat kasbon</h3>
              <small className="gj-count">{riwayatKasbon.length} kasbon</small>
            </div>
            <div className="gj-filters">
              <div className="gj-search-row">
                <label className="search">
                  <Icon name="search" />
                  <input
                    value={kCari}
                    onChange={(e) => setKCari(e.target.value)}
                    placeholder="Cari kapster atau catatan..."
                  />
                </label>
                <Button className="primary-button gj-add" onClick={bukaTambah} disabled={kapsters.length === 0}>
                  <Icon name="plus" /> Catat kasbon
                </Button>
              </div>
              <div className="gj-filter-grid">
                <SearchSelect value={kKapster} onChange={(e) => setKKapster(e.target.value)}>
                  <option value="">Semua kapster</option>
                  {kapsters.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </SearchSelect>
                <SearchSelect value={kStatus} onChange={(e) => setKStatus(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Aktif">Belum lunas</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Ditolak">Ditolak</option>
                </SearchSelect>
                <SearchSelect value={kUrut} onChange={(e) => setKUrut(e.target.value)}>
                  <option value="status">Menunggu &amp; belum lunas dulu</option>
                  <option value="terbaru">Tanggal terbaru</option>
                  <option value="terlama">Tanggal terlama</option>
                  <option value="terbesar">Jumlah terbesar</option>
                  <option value="terkecil">Jumlah terkecil</option>
                </SearchSelect>
                <PeriodePicker periode={kPeriode} onMode={setKMode} onTanggal={setKTanggal} />
              </div>
            </div>
            <div className="gj-table gj-kasbon">
              <div className="gj-head">
                <span>Kapster</span>
                <span>Tanggal</span>
                <span>Catatan</span>
                <span className="r">Jumlah</span>
                <span>Status</span>
                <span>Aksi</span>
              </div>
              {riwayatKasbon.map((k) => {
                const st = STATUS_KASBON[k.status]
                return (
                  <div className="gj-item" key={k.id}>
                    <div className="gj-row">
                      <span className="gj-main">
                        <strong>{k.nama}</strong>
                      </span>
                      <span data-l="Tanggal">{formatTanggal(k.tanggal)}</span>
                      <span className="gj-note" data-l="Catatan">
                        {k.catatan || "-"}
                        {k.status === "Lunas" && k.lunasWaktu && (
                          <small>
                            Lunas {formatTanggal(k.lunasWaktu)} · {k.gajiId ? "dipotong dari gaji" : "dilunasi manual"}
                          </small>
                        )}
                      </span>
                      <strong className="r" data-l="Jumlah">{rupiah(k.jumlah)}</strong>
                      <span className="gj-status"><i className={`chip ${st.chip}`}>{st.label}</i></span>
                      <span className="gj-aksi">
                        {k.status === "Menunggu" ? (
                          <>
                            <Button className="secondary-button" onClick={() => setKonfirmasi({ type: "setujui", item: k })}>
                              Setujui
                            </Button>
                            <Button className="danger-button" onClick={() => setKonfirmasi({ type: "tolak", item: k })}>
                              Tolak
                            </Button>
                          </>
                        ) : k.status === "Aktif" ? (
                          <Button className="secondary-button" onClick={() => setKonfirmasi({ type: "lunasi", item: k })}>
                            Tandai lunas
                          </Button>
                        ) : (
                          <span className="gj-dash">-</span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
              {riwayatKasbon.length === 0 && (
                <div className="lk-empty">
                  {kasbon.length === 0 ? "Belum ada catatan kasbon." : "Tidak ada kasbon yang cocok."}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {bayarKapster && (
        <div className="modal-overlay modal-centered" onClick={tutupBayar}>
          <form className="gj-modal" onSubmit={handleBayar} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">Bayar gaji</p>
                <h2>{bayarKapster.nama}</h2>
              </div>
              <Button type="button" aria-label="Tutup" onClick={tutupBayar}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="gj-modal-body">
              <div className="gj-sum">
                <div>
                  <span>Komisi ({hitung[bayarKapster.id].transaksiSelesai} transaksi)</span>
                  <b>{rupiah(komisiPopup)}</b>
                </div>
                <div>
                  <span>Potong kasbon</span>
                  <b>{potonganPopup > 0 ? `− ${rupiah(potonganPopup)}` : rupiah(0)}</b>
                </div>
                <div className="total">
                  <span>Gaji bersih dibayarkan</span>
                  <b>{rupiah(Math.max(0, komisiPopup - potonganPopup))}</b>
                </div>
              </div>

              {hitung[bayarKapster.id].kasbonAktif.length > 0 && (
                <div className="gj-field">
                  <span className="gj-label">Kasbon yang dipotong dari gaji ini</span>
                  <div className="gj-checks">
                    {hitung[bayarKapster.id].kasbonAktif.map((x) => (
                      <label className={`gj-check${pilih.includes(x.id) ? " on" : ""}`} key={x.id}>
                        <input
                          type="checkbox"
                          checked={pilih.includes(x.id)}
                          onChange={() =>
                            setPilih((p) => (p.includes(x.id) ? p.filter((i) => i !== x.id) : [...p, x.id]))
                          }
                        />
                        <span>
                          <strong>{formatTanggal(x.tanggal)}</strong>
                          <small>{x.catatan || "Tanpa catatan"}</small>
                        </span>
                        <b>{rupiah(x.jumlah)}</b>
                      </label>
                    ))}
                  </div>
                  <small className="gj-hint">
                    Wajib dicentang minimal satu. Kasbon yang tidak dicentang tetap belum lunas dan dibawa ke gaji berikutnya.
                  </small>
                </div>
              )}

              <div className="gj-field">
                <div className="gj-label-row">
                  <span className="gj-label">Catatan pembayaran (opsional)</span>
                  <button
                    type="button"
                    className="gj-link"
                    onClick={() => {
                      setCatatanLain(!catatanLain)
                      setCatatanBayar("")
                    }}
                  >
                    {catatanLain ? "Pilih catatan" : "Catatan lainnya"}
                  </button>
                </div>
                {catatanLain ? (
                  <input
                    className="gj-input"
                    placeholder="Tuliskan catatan pembayaran..."
                    value={catatanBayar}
                    onChange={(e) => setCatatanBayar(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="gj-chips">
                    {CATATAN_GAJI.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={catatanBayar === p ? "active" : ""}
                        onClick={() => setCatatanBayar(catatanBayar === p ? "" : p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {wajibCentang && (
                <div className="gj-alert" role="alert">
                  <Icon name="alert" />
                  <span>Centang kasbon yang dipotong dari gaji ini.</span>
                </div>
              )}
              {kelebihan && (
                <div className="gj-alert" role="alert">
                  <Icon name="alert" />
                  <span>Potongan kasbon melebihi komisi. Kurangi kasbon yang dicentang.</span>
                </div>
              )}
              {bayarError && (
                <div className="gj-alert" role="alert">
                  <Icon name="alert" />
                  <span>{bayarError}</span>
                </div>
              )}
            </div>
            <footer>
              <Button className="primary-button" type="submit" disabled={paying || kelebihan || wajibCentang}>
                {paying ? "Memproses..." : `Bayar ${rupiah(Math.max(0, komisiPopup - potonganPopup))}`}
              </Button>
            </footer>
          </form>
        </div>
      )}

      {tambahOpen && (
        <div className="modal-overlay modal-centered" onClick={() => !saving && setTambahOpen(false)}>
          <form className="gj-modal" onSubmit={handleTambah} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">Kasbon kapster</p>
                <h2>Catat kasbon</h2>
              </div>
              <Button type="button" aria-label="Tutup" onClick={() => setTambahOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="gj-modal-body">
              <label className="gj-field">
                <span className="gj-label">Kapster</span>
                <SearchSelect value={tKapster} onChange={(e) => setTKapster(e.target.value)}>
                  {kapsters.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </SearchSelect>
              </label>
              <label className="gj-field">
                <span className="gj-label">Jumlah kasbon</span>
                <div className="input-shell">
                  <b>Rp</b>
                  <input
                    inputMode="numeric"
                    value={tJumlah ? Number(tJumlah).toLocaleString("id-ID") : ""}
                    onChange={(e) => setTJumlah(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    required
                  />
                </div>
              </label>
              <label className="gj-field">
                <span className="gj-label">Catatan / keperluan</span>
                <textarea
                  className="gj-input"
                  placeholder="Contoh: keperluan keluarga, perbaikan motor..."
                  value={tCatatan}
                  onChange={(e) => setTCatatan(e.target.value)}
                  required
                />
              </label>
              <div className="gj-hint">Kasbon dari Owner langsung berstatus belum lunas dan ikut dipotong saat gaji dibayar.</div>
              {tambahError && (
                <div className="gj-alert" role="alert">
                  <Icon name="alert" />
                  <span>{tambahError}</span>
                </div>
              )}
            </div>
            <footer>
              <Button className="primary-button" type="submit" disabled={saving || !Number(tJumlah)}>
                {saving ? "Menyimpan..." : "Simpan kasbon"}
              </Button>
            </footer>
          </form>
        </div>
      )}

      {konfirmasi && (
        <ConfirmModal
          compact
          title={
            konfirmasi.type === "lunasi"
              ? `Tandai lunas kasbon ${konfirmasi.item.nama}?`
              : konfirmasi.type === "setujui"
                ? `Setujui kasbon ${konfirmasi.item.nama}?`
                : `Tolak kasbon ${konfirmasi.item.nama}?`
          }
          eyebrow={
            konfirmasi.type === "lunasi"
              ? "Pelunasan Kasbon"
              : konfirmasi.type === "setujui"
                ? "Persetujuan Kasbon"
                : "Penolakan Kasbon"
          }
          message={
            konfirmasi.type === "lunasi"
              ? `Kasbon ${rupiah(konfirmasi.item.jumlah)} ${namaKapster(konfirmasi.item.userId) || konfirmasi.item.nama} akan ditandai lunas dan tidak dipotong dari gaji. Pakai ini bila kasbon dibayar di luar gaji (tunai/transfer).`
              : konfirmasi.type === "setujui"
                ? `Pengajuan kasbon ${rupiah(konfirmasi.item.jumlah)} untuk ${konfirmasi.item.nama} akan disetujui dan ikut dipotong saat gaji dibayar.`
                : `Pengajuan kasbon ${rupiah(konfirmasi.item.jumlah)} untuk ${konfirmasi.item.nama} akan ditolak.`
          }
          confirmText={
            konfirmasi.type === "lunasi" ? "Tandai lunas" : konfirmasi.type === "setujui" ? "Setujui kasbon" : "Tolak kasbon"
          }
          confirmTone={konfirmasi.type === "tolak" ? "danger" : "primary"}
          onClose={() => setKonfirmasi(null)}
          onConfirm={handleKonfirmasi}
        />
      )}

      {eksporBuka && data && (
        <ExportModal
          judul={tab === "Gaji" ? "Ekspor Gaji" : "Ekspor Kasbon"}
          onBuat={async (o) => (tab === "Gaji" ? dokumenGaji(data.gaji, o) : dokumenKasbon(data.kasbon, o))}
          onClose={() => setEksporBuka(false)}
        />
      )}
    </div>
  )
}

export default PayrollPage
