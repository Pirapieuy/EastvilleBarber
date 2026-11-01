import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"

export function KapsterDashboard({
  user,
  onNavigate,
  navigate,
}: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const firstName = user?.name ? user.name.split(" ")[0] : "Seva"

  return (
    <div className="content kapster-dashboard">
      <PageTitle
        eyebrow="Rabu, 29 Oktober 2026 · Shift aktif"
        title={`Selamat pagi, ${firstName}.`}
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => nav("GajiKomisiSaya")}
            >
              <Icon name="wallet" /> Rincian Gaji & Kasbon
            </Button>
            <Button
              className="primary-button"
              onClick={() => nav("AbsensiJadwalSaya")}
            >
              <Icon name="camera" /> Check-in Absensi
            </Button>
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="people"
          label="Pelanggan Dilayani"
          tone="sage"
          value="5 orang"
          detail="Target shift 8 jam: 6 orang"
        />
        <Kpi
          icon="wallet"
          label="Komisi Layanan"
          tone="brass"
          value="Rp 140.000"
          detail="40% dari 5 pengerjaan"
        />
        <Kpi
          icon="product"
          label="Komisi Produk"
          tone="amber"
          value="Rp 30.000"
          detail="3 produk terjual hari ini"
        />
        <Kpi
          icon="check"
          label="Status Kehadiran"
          tone="dark"
          value="Tepat Waktu"
          detail="Check-in 09.52 WIB · Foto selfie OK"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel kapster-shift-panel">
          <PageTitle
            eyebrow="Target & Proteksi Shift (v1.2 KK-61)"
            title="Progres Shift 8 Jam Hari Ini"
            action={
              <div className="shift-badges">
                <span className="chip active">Shift 8 Jam</span>
                <small className="pending-client">
                  Menunggu konfirmasi klien
                </small>
              </div>
            }
          />
          <div className="shift-overview">
            <div>
              <small>Sudah dilayani</small>
              <strong>5</strong>
              <span>dari 6 pelanggan</span>
            </div>
            <div>
              <small>Sisa target</small>
              <strong>1</strong>
              <span>pelanggan</span>
            </div>
            <p>
              Tinggal satu pelanggan lagi untuk mencapai target reguler hari
              ini. Jika target belum tercapai sampai akhir shift, proteksi
              minimum &quot;1,5&quot; akan dicatat.
            </p>
          </div>
          <div className="shift-progress">
            <div className="progress-bar-shell">
              <div className="progress-bar-fill" style={{ width: "83%" }} />
            </div>
            <div className="progress-meta">
              <span>5 dari 6 pelanggan</span>
              <strong>83%</strong>
            </div>
          </div>
        </section>

        <section className="panel kapster-activity-panel">
          <PageTitle
            eyebrow="Pengerjaan Anda hari ini"
            title="Aktivitas Layanan & Produk"
          />
          <div className="recent-list">
            {[
              {
                item: "Haircut Classic",
                time: "10.15",
                fee: 50000,
                comm: 20000,
                type: "Layanan",
              },
              {
                item: "Haircut + Wash + Tonic",
                time: "11.30",
                fee: 70000,
                comm: 28000,
                type: "Layanan",
              },
              {
                item: "Beard Trim",
                time: "13.20",
                fee: 35000,
                comm: 14000,
                type: "Layanan",
              },
              {
                item: "Free Style Dust",
                time: "14.05",
                fee: 80000,
                comm: 10000,
                type: "Produk",
              },
              {
                item: "Haircut Classic",
                time: "15.40",
                fee: 50000,
                comm: 20000,
                type: "Layanan",
              },
            ].map((row, idx) => (
              <div key={idx} className="recent-row">
                <div className="recent-icon">
                  <Icon name={row.type === "Produk" ? "product" : "cashier"} />
                </div>
                <div className="recent-info">
                  <strong>{row.item}</strong>
                  <small>
                    {row.time} WIB · Total {rupiah(row.fee)}
                  </small>
                </div>
                <div className="recent-amount">
                  <span className="comm-label">Komisi:</span>
                  <strong>{rupiah(row.comm)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default KapsterDashboard
