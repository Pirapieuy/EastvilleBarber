import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"

export const staffSalary = [
  ["Seva", "SV", 47, 1880000, 210000, 350000, "Belum dibayar"],
  ["Tata", "TT", 39, 1560000, 140000, 0, "Dibayar"],
  ["Faisal", "FS", 35, 1400000, 70000, 500000, "Belum dibayar"],
  ["Fadhil", "FH", 42, 1680000, 175000, 200000, "Belum dibayar"],
  ["Ferdi", "FR", 38, 1520000, 150000, 100000, "Belum dibayar"],
] as const

export function KasbonTab() {
  const [add, setAdd] = useState(false)
  return (
    <>
      <PageTitle
        eyebrow="Saldo berjalan"
        title="Kasbon kapster"
        action={
          <Button className="primary-button" onClick={() => setAdd(true)}>
            <Icon name="plus" /> Catat kasbon
          </Button>
        }
      />
      <div className="advance-grid">
        {[
          ["Seva", "SV", 350000],
          ["Tata", "TT", 0],
          ["Faisal", "FS", 500000],
          ["Fadhil", "FH", 200000],
          ["Ferdi", "FR", 100000],
        ].map((x) => (
          <article key={x[0]}>
            <span>{x[1]}</span>
            <div>
              <strong>{x[0]}</strong>
              <small>Sisa kasbon</small>
              <b>{rupiah(Number(x[2]))}</b>
            </div>
          </article>
        ))}
      </div>
      <section className="panel list-panel">
        <div className="advance-row">
          <strong>Seva</strong>
          <span>24 Okt 2026</span>
          <span>Keperluan keluarga</span>
          <b>Rp 350.000</b>
          <i className="chip lunas">Aktif</i>
          <Button className="danger-link">Batalkan</Button>
        </div>
        <div className="advance-row">
          <strong>Faisal</strong>
          <span>20 Okt 2026</span>
          <span>Perbaikan kendaraan</span>
          <b>Rp 500.000</b>
          <i className="chip lunas">Aktif</i>
          <Button className="danger-link">Batalkan</Button>
        </div>
      </section>
      {add && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(e) => {
              e.preventDefault()
              setAdd(false)
            }}
          >
            <header>
              <h2>Catat kasbon</h2>
              <Button onClick={() => setAdd(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kapster</span>
              <select>
                <option>Seva</option>
                <option>Faisal</option>
              </select>
            </label>
            <label>
              <span>Jumlah</span>
              <div className="input-shell">
                <b>Rp</b>
                <input />
              </div>
            </label>
            <label>
              <span>Catatan</span>
              <textarea />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setAdd(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </>
  )
}

export function PayrollPage() {
  const [tab, setTab] = useState<"Gaji" | "Kasbon">("Gaji")
  const [pay, setPay] = useState<string | null>(null)

  return (
    <div className="content">
      <div className="segmented page-segment">
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
      {tab === "Gaji" ? (
        <>
          <section className="salary-hero">
            <div>
              <p className="eyebrow">Periode pembayaran</p>
              <h2>Oktober 2026</h2>
              <div className="segmented dark-segment">
                <Button>1–15 Okt</Button>
                <Button className="active">16–31 Okt</Button>
              </div>
            </div>
            <div>
              <small>Total gaji bersih</small>
              <strong>Rp 6.015.000</strong>
              <small>1/4 kapster dibayar</small>
            </div>
          </section>
          <div className="salary-grid">
            {staffSalary.map((x) => (
              <article className="salary-card" key={x[0]}>
                <header>
                  <span>{x[1]}</span>
                  <div>
                    <h3>{x[0]}</h3>
                    <small>{x[2]} pelanggan</small>
                  </div>
                  <i
                    className={`chip ${
                      x[6] === "Dibayar" ? "lunas" : "manual"
                    }`}
                  >
                    {x[6]}
                  </i>
                </header>
                <dl>
                  <div>
                    <dt>Komisi layanan</dt>
                    <dd>{rupiah(x[3])}</dd>
                  </div>
                  <div>
                    <dt>Komisi produk</dt>
                    <dd>{rupiah(x[4])}</dd>
                  </div>
                  <div className="deduct">
                    <dt>Potongan kasbon</dt>
                    <dd>− {rupiah(x[5])}</dd>
                  </div>
                </dl>
                <footer>
                  <span>
                    <small>Gaji bersih</small>
                    <strong>{rupiah(x[3] + x[4] - x[5])}</strong>
                  </span>
                  {x[6] !== "Dibayar" && (
                    <Button
                      className="primary-button"
                      onClick={() => setPay(x[0])}
                    >
                      Bayar
                    </Button>
                  )}
                </footer>
              </article>
            ))}
          </div>
          <div className="pending-grid">
            <article>
              <Icon name="lock" />
              <span>
                <strong>Target & proteksi 6/8 jam</strong>
                <small>Menunggu konfirmasi klien</small>
              </span>
            </article>
            <article>
              <Icon name="lock" />
              <span>
                <strong>Komisi “1,5”</strong>
                <small>Menunggu konfirmasi klien</small>
              </span>
            </article>
          </div>
          <section className="panel history-panel">
            <PageTitle eyebrow="Jejak pembayaran" title="Riwayat pembayaran" />
            <div className="history-payment">
              <span>DS</span>
              <strong>Tata</strong>
              <span>29 Okt 2026</span>
              <b>Rp 1.700.000</b>
              <Button className="danger-link">Batalkan pembayaran</Button>
            </div>
          </section>
        </>
      ) : (
        <KasbonTab />
      )}
      {pay && (
        <div className="modal-overlay">
          <section className="simple-modal">
            <header>
              <h2>Bayar {pay}</h2>
              <Button onClick={() => setPay(null)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Tanggal pembayaran</span>
              <input defaultValue="2026-10-29" type="date" />
            </label>
            <div className="pay-preview">
              <div>
                <span>Komisi layanan + produk</span>
                <strong>Rp 2.090.000</strong>
              </div>
              <div>
                <span>Potongan kasbon otomatis</span>
                <strong>− Rp 350.000</strong>
              </div>
              <div>
                <span>Gaji bersih</span>
                <strong>Rp 1.740.000</strong>
              </div>
            </div>
            <footer>
              <Button className="secondary-button" onClick={() => setPay(null)}>
                Batal
              </Button>
              <Button className="primary-button" onClick={() => setPay(null)}>
                Konfirmasi
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}

export default PayrollPage
