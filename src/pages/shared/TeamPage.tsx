import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"
import { AppUser, Role } from "../../types"

export const teamData = [
  ["AS", "Ardi Santoso", "Owner", "Aktif"],
  ["SV", "Seva", "Manajer,Kapster", "Aktif"],
  ["TT", "Tata", "Kasir,Kapster", "Aktif"],
  ["FS", "Faisal", "Kapster", "Aktif"],
  ["FH", "Fadhil", "Kapster", "Aktif"],
  ["FR", "Ferdi", "Kapster", "Aktif"],
]

export function TeamPage({
  currentUser,
  role,
  title,
}: {
  currentUser?: AppUser
  role?: Role
  title?: string
} = {}) {
  const [form, setForm] = useState(false)
  const [roles, setRoles] = useState<string[]>(["Kapster"])
  const [commission, setCommission] = useState(40)
  const isManager = (role ?? currentUser?.role) === "Manajer"
  const pageTitle = title ?? (isManager ? "Tim Manajer" : "Tim Eastville")

  return (
    <div className="content">
      <PageTitle
        eyebrow="Akun dan hak akses"
        title={pageTitle}
        action={
          isManager ? (
            <span className="chip active">Mode Lihat</span>
          ) : (
            <Button className="primary-button" onClick={() => setForm(true)}>
              <Icon name="plus" /> Tambah anggota
            </Button>
          )
        }
      />
      {isManager && (
        <div className="danger-banner" style={{ marginBottom: 14 }}>
          <Icon name="lock" /> Penambahan, pengubahan, dan penonaktifan anggota
          tim hanya dapat dilakukan oleh Owner.
        </div>
      )}
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <input placeholder="Cari nama atau username..." />
        </div>
        <select>
          <option>Semua peran</option>
        </select>
      </div>
      <div className="team-grid">
        {teamData.map((x) => (
          <article
            className={`team-card ${x[3] === "Nonaktif" ? "inactive" : ""}`}
            key={x[1]}
          >
            <header>
              <span>{x[0]}</span>
              <i className={x[3] === "Aktif" ? "active" : ""}>{x[3]}</i>
            </header>
            <h3>{x[1]}</h3>
            <small>@{x[1].toLowerCase().replace(" ", ".")}</small>
            <div className="roles">
              {x[2].split(",").map((r) => (
                <i key={r}>{r}</i>
              ))}
            </div>
            <dl>
              {x[2].includes("Kapster") && (
                <div>
                  <Icon name="chart" />
                  <span>Komisi 40%</span>
                </div>
              )}
            </dl>
            {!isManager && (
              <Button
                className="secondary-button"
                onClick={() => setForm(true)}
              >
                <Icon name="pencil" /> Ubah data
              </Button>
            )}
          </article>
        ))}
      </div>
      {form && (
        <div className="modal-overlay">
          <form
            className="staff-form"
            onSubmit={(e) => {
              e.preventDefault()
              setForm(false)
            }}
          >
            <header>
              <div>
                <p className="eyebrow">Anggota tim</p>
                <h2>Kelola data tim</h2>
              </div>
              <Button onClick={() => setForm(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="staff-form-body">
              <div className="form-grid">
                <label>
                  <span>Nama lengkap</span>
                  <input defaultValue="Seva" />
                </label>
                <label>
                  <span>Username</span>
                  <input defaultValue="seva" />
                </label>
                <label>
                  <span>Email reset PIN</span>
                  <input defaultValue="seva@eastville.id" />
                </label>
                <label>
                  <span>PIN awal 6 digit</span>
                  <input placeholder="••••••" type="password" />
                </label>
              </div>
              <span className="form-label">Pilih peran</span>
              <div className="role-options">
                {["Owner", "Manajer", "Kasir", "Kapster"].map((r) => (
                  <Button
                    className={roles.includes(r) ? "active" : ""}
                    key={r}
                    onClick={() =>
                      setRoles((v) =>
                        v.includes(r) ? v.filter((x) => x !== r) : [...v, r],
                      )
                    }
                  >
                    <i>{roles.includes(r) && <Icon name="check" />}</i>
                    {r}
                  </Button>
                ))}
              </div>
              {roles.includes("Kapster") && (
                <>
                  <label>
                    <span>Komisi pribadi</span>
                    <div className="input-shell">
                      <input
                        onChange={(e) => setCommission(Number(e.target.value))}
                        type="number"
                        value={commission}
                      />
                      <b>%</b>
                    </div>
                  </label>
                  <div className="info-banner">
                    <Icon name="alert" /> Berlaku untuk transaksi setelahnya.
                  </div>
                  <label>
                    <span>Alasan perubahan komisi</span>
                    <textarea placeholder="Wajib jika komisi berubah..." />
                  </label>
                </>
              )}
              <div className="toggle-row">
                <span>
                  <strong>Status akun</strong>
                  <small>Pengguna dapat masuk ke sistem</small>
                </span>
                <i className="toggle on">
                  <b />
                </i>
              </div>
            </div>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setForm(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan perubahan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default TeamPage
