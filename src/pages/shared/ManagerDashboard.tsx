import { useEffect, useState } from "react"
import { AbsensiRow, apiAbsensi, apiKasir, apiLaporan, getToken, LaporanKeuangan } from "../../api"
import { BarChart } from "../../components/common/BarChart"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"

export function ManagerDashboard({
  user,
  onNavigate,
  navigate,
}: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const firstName = user?.name ? user.name.split(" ")[0] : "Manajer"
  const [hari, setHari] = useState<LaporanKeuangan | null>(null)
  const [minggu, setMinggu] = useState<LaporanKeuangan | null>(null)
  const [liveError, setLiveError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [absensi, setAbsensi] = useState<AbsensiRow[] | null>(null)
  const [kapsterAll, setKapsterAll] = useState<{ id: string; nama: string }[]>([])
  const [today] = useState(() => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const now = new Date()
    const awal = new Date(now)
    awal.setDate(now.getDate() - 6)
    return { hariIni: iso(now), awalMinggu: iso(awal), label: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }
  })

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
    Promise.all([
      apiLaporan.keuangan({ dari: today.hariIni, sampai: today.hariIni }),
      apiLaporan.keuangan({ dari: today.awalMinggu, sampai: today.hariIni }),
    ])
      .then(([a, b]) => {
        setHari(a)
        setMinggu(b)
      })
      .catch((e) => {
        console.error("Gagal memuat beranda:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
    // Absensi milik modul lain: bila gagal, panel kehadiran menampilkan "tidak tersedia" (bukan data palsu).
    Promise.all([apiAbsensi.list({ tanggal: today.hariIni }), apiKasir.kapster()])
      .then(([rows, kap]) => {
        setAbsensi(rows)
        setKapsterAll(kap)
      })
      .catch((e) => {
        console.error("Gagal memuat absensi:", e)
        setAbsensi(null)
      })
  }, [reloadKey])

  if (Boolean(getToken()) && !hari && !liveError) {
    return (
      <div className="content">
        <p>Memuat beranda...</p>
      </div>
    )
  }
  if (Boolean(getToken()) && !hari && liveError) {
    return (
      <div className="content">
        <DemoNotice live={false} error={liveError} />
        <p>Beranda gagal dimuat: {liveError}</p>
        <Button className="primary-button" onClick={() => setReloadKey((k) => k + 1)}>
          Coba lagi
        </Button>
      </div>
    )
  }
  const d = hari
  const kapsterAktif = d?.perKapster.length ?? 0
  const live = Boolean(hari)
  // Kehadiran hari ini dari absensi (Masuk/Pulang) per kapster
  const tim = kapsterAll.map((k) => {
    const rows = (absensi ?? []).filter((r) => r.userId === k.id)
    const masuk = rows.find((r) => r.tipe === "Masuk")
    const pulang = rows.find((r) => r.tipe === "Pulang")
    return {
      name: k.nama,
      hadir: Boolean(masuk),
      checkin: masuk?.jam,
      status: pulang ? "Sudah pulang" : (masuk?.status ?? "Belum check-in"),
      done: d?.perKapster.find((p) => p.kapsterId === k.id)?.pelanggan ?? 0,
    }
  })
  const hadirCount = tim.filter((t) => t.hadir).length

  return (
    <div className="content">
      <DemoNotice live={Boolean(hari)} error={liveError} />
      <PageTitle
        eyebrow={`${today.label} · Operasional`}
        title={`Selamat datang, ${firstName}.`}
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => nav("RekapManual")}
            >
              <Icon name="pencil" /> Rekap Manual
            </Button>
            <Button
              className="primary-button"
              onClick={() => nav("Pengeluaran")}
            >
              <Icon name="expense" /> Catat Pengeluaran
            </Button>
            {Boolean(getToken()) && (
              <Button className="secondary-button" onClick={() => setReloadKey((k) => k + 1)}>
                Muat ulang
              </Button>
            )}
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value={d ? rupiah(d.pemasukan) : "Rp 2.450.000"}
          detail={d ? `Tunai ${rupiah(d.tunai)} · QRIS ${rupiah(d.qris)}` : "Data demo"}
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value={d ? rupiah(d.pengeluaran) : "Rp 320.000"}
          detail={d ? `Sisa ${rupiah(d.sisa)}` : "Operasional harian"}
        />
        <Kpi
          icon="people"
          label="Komisi Kapster"
          tone="brass"
          value={d ? rupiah(d.komisi) : "Rp 980.000"}
          detail={d ? `${kapsterAktif} kapster melayani hari ini` : "Data demo"}
        />
        <Kpi
          icon="check"
          label="Kehadiran Tim"
          tone="dark"
          value={live ? (absensi ? `${hadirCount} dari ${tim.length} Hadir` : "-") : "3 dari 3 Hadir"}
          detail={
            live
              ? absensi
                ? tim.filter((t) => t.hadir).map((t) => t.name).join(", ") || "Belum ada yang check-in"
                : "Data absensi tidak tersedia"
              : "Seva, Tata, Ferdi · Tepat Waktu"
          }
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Operasional" title="Arus Pemasukan" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai: <strong>{d ? rupiah(d.tunai) : "Rp 1.150.000"}</strong>
              </span>
            </div>
            <div>
              <i className="dot amber-dot" />
              <span>
                QRIS: <strong>{d ? rupiah(d.qris) : "Rp 1.300.000"}</strong>
              </span>
            </div>
          </div>
          <BarChart
            data={(minggu?.perHari ?? []).map((h) => ({
              label: new Date(h.tanggal + "T12:00:00").toLocaleDateString("id-ID", { weekday: "short" }),
              value: h.total,
            }))}
          />
        </section>

        <section className="panel staff-duty-panel">
          <div className="staff-panel-header">
            <div className="staff-panel-top">
              <p className="eyebrow">Kapster Bertugas</p>
              <Button
                className="text-button staff-panel-action"
                onClick={() => nav("AbsensiTim")}
              >
                Lihat Semua Foto <Icon name="arrow" />
              </Button>
            </div>
            <h2 className="staff-panel-title">Status Shift & Absensi Hari Ini</h2>
          </div>
          <div className="staff-duty-list">
            {(live
              ? tim.map((t) => ({
                  name: t.name,
                  shift: "",
                  checkin: t.checkin ? `${t.checkin} WIB` : "-",
                  status: t.status,
                  done: t.done,
                }))
              : [
              {
                name: "Seva",
                shift: "10.00 - 20.00",
                checkin: "09.52 WIB",
                status: "Tepat Waktu",
                done: 5,
              },
              {
                name: "Tata",
                shift: "10.00 - 20.00",
                checkin: "09.48 WIB",
                status: "Tepat Waktu",
                done: 6,
              },
              {
                name: "Ferdi",
                shift: "12.00 - 21.00",
                checkin: "11.55 WIB",
                status: "Tepat Waktu",
                done: 4,
              },
            ]).map((s, idx) => (
              <div key={idx} className="staff-duty-row">
                <div className="staff-avatar">{s.name.charAt(0)}</div>
                <div className="staff-duty-info">
                  <strong>{s.name}</strong>
                  <small>
                    {s.shift ? `Shift ${s.shift} · ` : ""}Check-in: {s.checkin}
                  </small>
                </div>
                <div className="staff-duty-status">
                  <span className="chip active">{s.status}</span>
                  <small>{s.done} pelanggan dilayani</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard
