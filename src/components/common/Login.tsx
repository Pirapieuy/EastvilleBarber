import { FormEvent, useState } from "react"
import { Icon } from "./Icon"
import { Button, BrandMark } from "./UI"
import { AppUser, Page } from "../../types"
import { loginBackend } from "../../api"

export function Login({
  onLogin,
}: {
  onLogin: (user: AppUser, targetPage?: Page) => void
}) {
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [view, setView] = useState<"login" | "email" | "sent" | "reset">("login")
  const [email, setEmail] = useState("")
  const [newPin, setNewPin] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    const cleanPin = pin.trim()

    if (!cleanUsername) {
      setError("Masukkan username Anda.")
      return
    }
    if (!cleanPin || cleanPin.length !== 6) {
      setError("Masukkan PIN 6 digit.")
      return
    }

    setError("")
    setLoading(true)
    try {
      const user = await loginBackend(cleanUsername, cleanPin)
      const appUser: AppUser = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      }
      const targetPage: Page =
        user.role === "Kasir"
          ? "cashier"
          : user.role === "Manajer"
            ? "services"
            : "dashboard"
      onLogin(appUser, targetPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal.")
    } finally {
      setLoading(false)
    }
  }

  if (view !== "login") {
    return (
      <main className="login-page">
        <section className="login-brand">
          <div className="barber-stripe" />
          <BrandMark />
          <div className="login-message">
            <p className="eyebrow">Pemulihan akun</p>
            <h1>Akses aman untuk kembali bekerja.</h1>
            <p>
              Atur ulang PIN melalui email yang terdaftar pada akun Eastville.
            </p>
          </div>
        </section>
        <section className="login-form-wrap">
          <div className="login-card reset-card">
            <div className="login-mobile-header">
              <BrandMark />
            </div>
            {view === "email" && (
              <>
                <Button className="auth-back" onClick={() => setView("login")}>
                  <Icon name="back" /> Kembali
                </Button>
                <p className="eyebrow">Lupa PIN</p>
                <h2>Temukan akun Anda</h2>
                <p>Masukkan email yang terdaftar pada data karyawan.</p>
                <label>
                  <span>Email</span>
                  <div className="input-shell">
                    <Icon name="mail" />
                    <input
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nama@eastville.id"
                      type="email"
                      value={email}
                    />
                  </div>
                </label>
                <Button
                  className="primary-button"
                  disabled={!email.includes("@")}
                  onClick={() => setView("sent")}
                >
                  Kirim tautan reset <Icon name="arrow" />
                </Button>
              </>
            )}
            {view === "sent" && (
              <div className="auth-success">
                <span>
                  <Icon name="mail" />
                </span>
                <p className="eyebrow">Email terkirim</p>
                <h2>Tautan reset dikirim</h2>
                <p>
                  Periksa kotak masuk <strong>{email}</strong> dan ikuti tautan
                  yang diberikan.
                </p>
                <Button
                  className="primary-button"
                  onClick={() => setView("reset")}
                >
                  Buka simulasi tautan
                </Button>
                <Button
                  className="text-button"
                  onClick={() => setView("email")}
                >
                  Gunakan email lain
                </Button>
              </div>
            )}
            {view === "reset" && (
              <>
                <p className="eyebrow">Buat PIN baru</p>
                <h2>Atur ulang PIN</h2>
                <p>
                  Gunakan enam digit yang mudah Anda ingat tetapi sulit ditebak.
                </p>
                <label>
                  <span>PIN baru</span>
                  <div className="input-shell">
                    <Icon name="lock" />
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) =>
                        setNewPin(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder="••••••"
                      type="password"
                      value={newPin}
                    />
                  </div>
                  <small className="pin-helper">{newPin.length}/6 digit</small>
                </label>
                <Button
                  className="primary-button"
                  disabled={newPin.length !== 6}
                  onClick={() => {
                    setPin("")
                    setView("login")
                  }}
                >
                  Simpan PIN baru
                </Button>
              </>
            )}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="barber-stripe" />
        <BrandMark />
        <div className="login-message">
          <p className="eyebrow">Ruang kerja Eastville</p>
          <h1>Lebih rapi mengelola, lebih fokus melayani.</h1>
          <p>Satu tempat untuk transaksi, komisi, dan operasional harian.</p>
        </div>
        <div className="online">
          <i /> Sistem operasional terhubung
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-mobile-header">
            <BrandMark />
          </div>
          <h1 className="login-title">LOGIN</h1>
          <label>
            <span>Username</span>
            <div className="input-shell">
              <Icon name="user" />
              <input
                autoCapitalize="none"
                autoComplete="username"
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError("")
                }}
                placeholder="Contoh: ardi.owner"
                value={username}
              />
            </div>
          </label>
          <label>
            <span>PIN</span>
            <div className={`input-shell ${error ? "error" : ""}`}>
              <Icon name="lock" />
              <input
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""))
                  setError("")
                }}
                placeholder="••••••"
                type={show ? "text" : "password"}
                value={pin}
              />
              <Button
                aria-label={show ? "Sembunyikan PIN" : "Tampilkan PIN"}
                onClick={() => setShow(!show)}
                type="button"
              >
                <Icon name="eye" />
              </Button>
            </div>
            {error && <small>{error}</small>}
          </label>
          <Button
            className="primary-button login-submit-btn"
            disabled={loading}
            type="submit"
          >
            {loading ? "Memproses..." : "Masuk"} <Icon name="arrow" />
          </Button>
          <Button
            className="text-button"
            onClick={() => setView("email")}
            type="button"
          >
            Lupa PIN?
          </Button>
          <div className="secure-note">
            <Icon name="lock" /> PIN disimpan aman dan tidak pernah ditampilkan.
          </div>
        </form>
      </section>
    </main>
  )
}
