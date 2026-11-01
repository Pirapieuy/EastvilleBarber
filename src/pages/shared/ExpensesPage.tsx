import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"

export const expenses = [
  ["29 Okt", "Perlengkapan", "Pisau cukur dan sarung tangan", 485000, "Aktif"],
  ["28 Okt", "Listrik", "Token listrik Oktober", 750000, "Aktif"],
  ["26 Okt", "Air", "Tagihan PDAM Oktober", 215000, "Aktif"],
  ["24 Okt", "Sewa", "Sewa tempat bulan November", 3500000, "Aktif"],
  ["22 Okt", "Lain-lain", "Konsumsi rapat tim", 280000, "BATAL"],
] as const

export function ExpensesPage() {
  const [form, setForm] = useState(false)

  return (
    <div className="content">
      <PageTitle
        eyebrow="Operasional"
        title="Pengeluaran"
        action={
          <Button className="primary-button" onClick={() => setForm(true)}>
            <Icon name="plus" /> Catat pengeluaran
          </Button>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="expense"
          label="Total bulan ini"
          tone="brass"
          value="Rp 5.840.000"
          detail="Oktober 2026"
        />
      </div>
      <section className="panel list-panel">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Cari keterangan..." />
          </div>
          <select>
            <option>Semua kategori</option>
          </select>
        </div>
        <div className="expense-head">
          <span>Tanggal</span>
          <span>Kategori</span>
          <span>Keterangan</span>
          <span>Jumlah</span>
          <span>Status</span>
          <span />
        </div>
        {expenses.map((row) => (
          <div
            className={`expense-row ${row[4] === "BATAL" ? "voided" : ""}`}
            key={row[2]}
          >
            <span>{row[0]}</span>
            <strong>{row[1]}</strong>
            <span>
              {row[2]}
              {row[4] === "BATAL" && (
                <small>Dibatalkan oleh Seva · salah nominal</small>
              )}
            </span>
            <strong>{rupiah(row[3])}</strong>
            <i className={`chip ${row[4].toLowerCase()}`}>{row[4]}</i>
            {row[4] === "BATAL" ? (
              <Button className="secondary-button">
                <Icon name="restore" /> Pulihkan
              </Button>
            ) : (
              <Button>
                <Icon name="arrow" />
              </Button>
            )}
          </div>
        ))}
      </section>
      {form && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(e) => {
              e.preventDefault()
              setForm(false)
            }}
          >
            <header>
              <h2>Catat pengeluaran</h2>
              <Button onClick={() => setForm(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kategori</span>
              <select>
                <option>Listrik</option>
                <option>Air</option>
                <option>Sewa</option>
                <option>Perlengkapan</option>
                <option>Lain-lain</option>
              </select>
            </label>
            <label>
              <span>Jumlah</span>
              <div className="input-shell">
                <b>Rp</b>
                <input placeholder="0" />
              </div>
            </label>
            <label>
              <span>Keterangan</span>
              <textarea placeholder="Keterangan pengeluaran..." />
            </label>
            <label>
              <span>Tanggal</span>
              <input defaultValue="2026-10-29" type="date" />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setForm(false)}
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
    </div>
  )
}

export default ExpensesPage
