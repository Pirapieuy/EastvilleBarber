import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, LoadingState, PageTitle } from "../../components/common/UI"
import { ConfirmModal } from "../../components/common/ConfirmModal"
import { AppUser, Role } from "../../types"
import {
  apiTim,
  apiPengaturan,
  getToken,
  UserRow,
  PengaturanKomisi,
} from "../../api"

export const demoTeamData: UserRow[] = [
  {
    id: "u-owner",
    nama: "Ardi Pradana",
    username: "owner",
    role: "Owner",
    cabang: "Semua cabang",
    email: "ardi@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kasir",
    nama: "Siti Rahma",
    username: "kasir",
    role: "Kasir",
    cabang: "Patihan",
    email: "siti@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster",
    nama: "Ferdi",
    username: "ferdi",
    role: "Kapster",
    cabang: "Patihan",
    email: "ferdi@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster2",
    nama: "Seva",
    username: "seva",
    role: "Kapster",
    cabang: "Patihan",
    email: "seva@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster3",
    nama: "Tatas",
    username: "tatas",
    role: "Kapster",
    cabang: "Patihan",
    email: "tatas@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster4",
    nama: "Faisal",
    username: "faisal",
    role: "Kapster",
    cabang: "Patihan",
    email: "faisal@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster5",
    nama: "Fadhil",
    username: "fadhil",
    role: "Kapster",
    cabang: "Patihan",
    email: "fadhil@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
  {
    id: "u-kapster6",
    nama: "Kris",
    username: "kris",
    role: "Kapster",
    cabang: "Patihan",
    email: "kris@eastville.id",
    status: "Aktif",
    dibuat: "2026-11-01",
  },
]

export function TeamPage({ currentUser, role, title }: {
  currentUser?: AppUser
  role?: Role
  title?: string
} = {}) {
  const [users, setUsers] = useState<UserRow[]>(getToken() ? [] : demoTeamData)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("Semua")

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [statusModalUser, setStatusModalUser] = useState<UserRow | null>(null)
  const [nama, setNama] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>("Kapster")
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif")
  const [formError, setFormError] = useState("")

  const [commission, setCommission] = useState(40)
  const [commissionReason, setCommissionReason] = useState("")
  const [komisiMap, setKomisiMap] = useState<Record<string, number>>({})

  const isOwner = (role ?? currentUser?.role) === "Owner"
  const pageTitle = title ?? "Tim Eastville"

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [list, peng] = await Promise.all([
        apiTim.list(),
        apiPengaturan.get().catch(() => null as PengaturanKomisi | null),
      ])
      setUsers(list)
      if (peng && peng.kapster) {
        const km: Record<string, number> = {}
        peng.kapster.forEach((k) => {
          if (k.persen !== null) km[k.id] = k.persen
        })
        setKomisiMap(km)
      }
      setLoadError("")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data tim.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openCreate() {
    setEditingId(null)
    setNama("")
    setUsername("")
    setEmail("")
    setPin("")
    setSelectedRole("Kapster")
    setStatus("Aktif")
    setCommission(40)
    setCommissionReason("")
    setFormError("")
    setFormOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id)
    setNama(u.nama)
    setUsername(u.username)
    setEmail(u.email)
    setPin("")
    setSelectedRole(u.role)
    setStatus(u.status)
    setCommission(komisiMap[u.id] ?? 40)
    setCommissionReason("")
    setFormError("")
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim() || !username.trim() || !email.trim()) {
      alert("Mohon lengkapi nama, username, dan email.")
      return
    }

    try {
      if (editingId) {
        await apiTim.update({
          id: editingId,
          nama: nama.trim(),
          username: username.trim(),
          email: email.trim(),
          role: selectedRole,
          newPin: pin.trim() ? pin.trim() : undefined,
        })
        if (selectedRole === "Kapster" && commissionReason.trim()) {
          await apiPengaturan.setKomisiKapster(
            editingId,
            commission,
            commissionReason.trim(),
          )
        }
      } else {
        if (!pin.trim() || pin.trim().length !== 6) {
          setFormError("PIN awal harus 6 digit angka.")
          return
        }
        const created = await apiTim.create({
          nama: nama.trim(),
          username: username.trim(),
          pin: pin.trim(),
          email: email.trim(),
          role: selectedRole,
        })
        if (
          selectedRole === "Kapster" &&
          commission !== 40 &&
          commissionReason.trim()
        ) {
          await apiPengaturan.setKomisiKapster(
            created.id,
            commission,
            commissionReason.trim(),
          )
        }
      }
      setFormOpen(false)
      loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    }
  }

  function handleToggleStatus(u: UserRow) {
    if (!isOwner) return
    setStatusModalUser(u)
  }

  async function handleConfirmToggleStatus() {
    if (!statusModalUser) return
    const nextStatus =
      statusModalUser.status === "Aktif" ? "Nonaktif" : "Aktif"
    await apiTim.toggleStatus(statusModalUser.id, nextStatus)
    loadData()
  }

  async function handleConfirmDeleteUser(user: UserRow, alasan: string) {
    if ((apiTim as any).hapus) {
      await (apiTim as any).hapus(user.id, alasan.trim())
    }
    loadData()
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "Semua" || u.role === roleFilter
    return matchSearch && matchRole
  })
  // Tim Eastville (Owner): anggota nonaktif selalu di paling bawah.
  if (isOwner)
    filtered.sort(
      (a, b) =>
        Number(a.status === "Nonaktif") - Number(b.status === "Nonaktif"),
    )

  function getInitials(name: string) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="content">
      <PageTitle
        eyebrow="Akun dan hak akses"
        title={pageTitle}
        action={
          <Button className="primary-button" onClick={openCreate}>
            <Icon name="plus" /> Tambah anggota
          </Button>
        }
      />
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="Cari nama atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="team-role-filter" role="group" aria-label="Filter peran">
          {[
            ["Semua", "Semua peran"],
            ["Owner", "Owner"],
            ["Kasir", "Kasir"],
            ["Kapster", "Kapster"],
          ].map(([value, label]) => (
            <button
              className={roleFilter === value ? "active" : ""}
              type="button"
              key={value}
              aria-pressed={roleFilter === value}
              onClick={() => setRoleFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="team-loading-state">
          <LoadingState message="Memuat data tim..." compact />
        </div>
      )}
      {loadError && (
        <p role="alert" style={{ color: "#dc2626", margin: "10px 0" }}>
          Data tim gagal dimuat: {loadError}{" "}
          <Button className="secondary-button" onClick={() => loadData()}>
            Coba lagi
          </Button>
        </p>
      )}

      <div className={`team-grid${isOwner ? " team-grid-owner" : ""}`}>
        {filtered.map((x) => (
          <article
            className={`team-card role-${x.role.toLowerCase()} ${x.status === "Nonaktif" ? "inactive" : ""}`}
            key={x.id}
          >
            <header>
              <span>{getInitials(x.nama)}</span>
              <i
                className={x.status === "Aktif" ? "active" : ""}
                style={{
                  cursor: isOwner && x.role !== "Owner" ? "pointer" : "default",
                }}
                onClick={() => {
                  if (isOwner && x.role !== "Owner") handleToggleStatus(x)
                }}
                title={
                  isOwner && x.role !== "Owner"
                    ? "Klik untuk ganti status"
                    : undefined
                }
              >
                {x.status}
              </i>
            </header>
            <h3>{x.nama}</h3>
            <small>@{x.username}</small>
            <div className="roles">
              <i>{x.role}</i>
              {isOwner && x.role === "Kapster" && (
                <i className="role-komisi">
                  Komisi {komisiMap[x.id] ?? 40}%
                </i>
              )}
            </div>
            <dl>
              {x.role === "Kapster" && !isOwner && (
                <div>
                  <Icon name="chart" />
                  <span>Komisi {komisiMap[x.id] ?? 40}%</span>
                </div>
              )}
            </dl>
              <div className="team-card-actions">
                <Button
                  className="secondary-button"
                  onClick={() => openEdit(x)}
                >
                  <Icon name="pencil" /> Ubah data
                </Button>
                {x.role !== "Owner" && (
                  <Button
                    className="danger-button"
                    onClick={() => setDeletingUser(x)}
                  >
                    Hapus
                  </Button>
                )}
              </div>
          </article>
        ))}
      </div>

      {formOpen && (
        <div className="modal-overlay">
          <form className="staff-form" onSubmit={handleSubmit}>
            <header>
              <div>
                <p className="eyebrow">Anggota tim</p>
                <h2>{editingId ? "Ubah Data Tim" : "Tambah Anggota Tim"}</h2>
              </div>
            </header>
            <div className="staff-form-body">
              <div className="form-grid">
                <label>
                  <span>Nama lengkap</span>
                  <input
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Ardi Pradana"
                    required
                  />
                </label>
                <label>
                  <span>Username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Contoh: owner"
                    required
                  />
                </label>
                <label>
                  <span>Email reset PIN</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@eastville.id"
                    required
                  />
                </label>
                <label>
                  <span>
                    {editingId
                      ? "Ganti PIN 6 digit (opsional)"
                      : "PIN awal 6 digit"}
                  </span>
                  <input
                    placeholder="••••••"
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </label>
              </div>

              <span className="form-label">Pilih peran</span>
              <div className="role-options">
                {(["Kasir", "Kapster"] as Role[]).map((r) => (
                  <Button
                    className={selectedRole === r ? "active" : ""}
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                  >
                    <i>{selectedRole === r && <Icon name="check" />}</i>
                    {r}
                  </Button>
                ))}
              </div>

              {selectedRole === "Kapster" && (
                <>
                  <label>
                    <span>Komisi pribadi</span>
                    <div className="input-shell">
                      <input
                        onChange={(e) => setCommission(Number(e.target.value))}
                        type="number"
                        min={10}
                        max={90}
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
                    <textarea
                      placeholder="Wajib jika komisi berubah dari default..."
                      value={commissionReason}
                      onChange={(e) => setCommissionReason(e.target.value)}
                    />
                  </label>
                </>
              )}

              <div
                className="toggle-row"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setStatus((s) => (s === "Aktif" ? "Nonaktif" : "Aktif"))
                }
              >
                <span>
                  <strong>Status akun: {status}</strong>
                  <small>
                    Pengguna dapat masuk ke sistem bila status aktif
                  </small>
                </span>
                <i className={`toggle ${status === "Aktif" ? "on" : ""}`}>
                  <b />
                </i>
              </div>
            </div>
            {formError && (
              <div
                className="info-banner"
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--oxblood-soft)",
                  color: "var(--oxblood)",
                  fontSize: 12,
                }}
              >
                <Icon name="alert" />
                <span>{formError}</span>
              </div>
            )}
            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setFormOpen(false)}
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

      {statusModalUser && (
        <ConfirmModal
          title={`Ubah Status ${statusModalUser.nama}?`}
          eyebrow="Ubah Status Karyawan"
          message={`Ubah status ${statusModalUser.nama} (@${statusModalUser.username}) menjadi ${
            statusModalUser.status === "Aktif" ? "Nonaktif" : "Aktif"
          }? ${
            statusModalUser.status === "Aktif"
              ? "Karyawan nonaktif tidak akan dapat masuk ke sistem."
              : "Karyawan akan dapat mengakses sistem kembali."
          }`}
          confirmText={`Jadikan ${
            statusModalUser.status === "Aktif" ? "Nonaktif" : "Aktif"
          }`}
          confirmTone={statusModalUser.status === "Aktif" ? "danger" : "primary"}
          onClose={() => setStatusModalUser(null)}
          onConfirm={handleConfirmToggleStatus}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          title={`Hapus Anggota Tim "${deletingUser.nama}"?`}
          eyebrow="Hapus Karyawan"
          warning="Tindakan ini akan menghapus akun karyawan dari sistem. Riwayat transaksi lama tetap tersimpan."
          requireReason
          reasonLabel="Alasan Penghapusan"
          reasonPlaceholder="Contoh: Karyawan sudah resign / tidak lagi bekerja..."
          confirmText="Hapus Karyawan"
          confirmTone="danger"
          onClose={() => setDeletingUser(null)}
          onConfirm={(alasan) =>
            handleConfirmDeleteUser(deletingUser, alasan)
          }
        />
      )}
    </div>
  )
}

export default TeamPage
