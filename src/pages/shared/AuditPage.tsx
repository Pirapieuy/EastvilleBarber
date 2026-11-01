import { Icon } from "../../components/common/Icon"
import { PageTitle } from "../../components/common/UI"

export function AuditPage() {
  const logs = [
    [
      "29 Okt 10.42",
      "Ardi Santoso",
      "Ubah komisi",
      "Free Style Dust",
      "8% → 10%",
      "Kesepakatan baru",
    ],
    ["29 Okt 10.24", "Tata", "Login", "Akun Tata", "Berhasil", "—"],
    [
      "29 Okt 09.54",
      "Ardi Santoso",
      "Buka foto absensi",
      "Seva",
      "29 Okt 2026",
      "Pemeriksaan harian",
    ],
    [
      "29 Okt 09.12",
      "Tata",
      "Batalkan transaksi",
      "INV-291026-0082",
      "Rp 110.000",
      "Salah input",
    ],
    [
      "28 Okt 18.40",
      "Seva",
      "Pulihkan transaksi",
      "INV-281026-0077",
      "Rp 70.000",
      "Transaksi valid",
    ],
    [
      "28 Okt 16.20",
      "Ardi Santoso",
      "Bayar gaji",
      "Tata",
      "Rp 1.700.000",
      "Periode 16–31",
    ],
  ]

  return (
    <div className="content">
      <PageTitle eyebrow="Khusus Owner" title="Jejak audit" />
      <div className="append-only-note">
        <Icon name="lock" />
        <span>
          <strong>Log hanya-tambah</strong>Data tidak dapat diubah atau dihapus.
        </span>
      </div>
      <section className="panel audit-list">
        <div className="filters">
          <div className="input-shell">
            <Icon name="calendar" />
            <input defaultValue="2026-10-29" type="date" />
          </div>
          <select>
            <option>Semua jenis aksi</option>
            <option>Login</option>
            <option>Transaksi</option>
            <option>Gaji</option>
          </select>
          <select>
            <option>Semua pengguna</option>
          </select>
        </div>
        <div className="audit-head">
          <span>Waktu</span>
          <span>Pengguna</span>
          <span>Aksi</span>
          <span>Objek</span>
          <span>Detail</span>
          <span>Alasan</span>
        </div>
        {logs.map((row) => (
          <article className="audit-row" key={row.join("-")}>
            {row.map((value, index) => (
              <span
                className={index === 2 ? "audit-action" : ""}
                key={`${value}-${index}`}
              >
                {value}
              </span>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}

export default AuditPage
