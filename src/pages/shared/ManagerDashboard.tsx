import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle } from "../../components/common/UI"
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
  const firstName = user?.name ? user.name.split(" ")[0] : "Dian"

  return (
    <div className="content">
      <PageTitle
        eyebrow="Rabu, 29 Oktober 2026 · Operasional"
        title={`Selamat pagi, ${firstName}.`}
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
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value="Rp 2.450.000"
          detail="Tunai Rp 1.150.000 · QRIS Rp 1.300.000"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 320.000"
          detail="Operasional harian"
        />
        <Kpi
          icon="people"
          label="Komisi Kapster"
          tone="brass"
          value="Rp 980.000"
          detail="3 kapster bertugas hari ini"
        />
        <Kpi
          icon="check"
          label="Kehadiran Tim"
          tone="dark"
          value="3 dari 3 Hadir"
          detail="Seva, Tata, Ferdi · Tepat Waktu"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Operasional" title="Arus Pemasukan" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai: <strong>Rp 1.150.000</strong>
              </span>
            </div>
            <div>
              <i className="dot amber-dot" />
              <span>
                QRIS: <strong>Rp 1.300.000</strong>
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {[45, 60, 52, 70, 85, 65, 78].map((h, i) => (
              <div key={i} className="bar-col">
                <div className="bar-fill" style={{ height: `${h}%` }} />
                <small>
                  {["Kam", "Jum", "Sab", "Min", "Sen", "Sel", "Rab"][i]}
                </small>
              </div>
            ))}
          </div>
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
            {[
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
            ].map((s, idx) => (
              <div key={idx} className="staff-duty-row">
                <div className="staff-avatar">{s.name.charAt(0)}</div>
                <div className="staff-duty-info">
                  <strong>{s.name}</strong>
                  <small>
                    Shift {s.shift} · Check-in: {s.checkin}
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
