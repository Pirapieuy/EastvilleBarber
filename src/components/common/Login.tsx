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
      const targetPage: Page = user.role === "Kasir" ? "cashier" : "dashboard"
      onLogin(appUser, targetPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal.")
    } finally {
      setLoading(false)
    }
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
        <div className="login-mobile-header">
          <BrandMark />
        </div>
        <form className="login-card" onSubmit={submit}>
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
                placeholder="Contoh: owner"
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
          <p className="login-pin-help">
            Lupa PIN? Hubungi Owner untuk reset PIN.
          </p>
          <div className="secure-note">
            <Icon name="lock" /> PIN disimpan aman dan tidak pernah ditampilkan.
          </div>
        </form>
      </section>
    </main>
  )
}
