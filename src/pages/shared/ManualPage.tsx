import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"

export function ManualPage() {
  const [note, setNote] = useState("")
  const duplicate = note === "INV-291026-0084"

  return (
    <div className="content narrow">
      <PageTitle eyebrow="Transaksi dari buku" title="Input susulan" />
      <section className="panel form-panel">
        <h3>Informasi transaksi</h3>
        <div className="form-grid manual-info-grid">
          <label>
            <span>Tanggal transaksi</span>
            <input max="2026-10-29" defaultValue="2026-10-28" type="date" />
            <small>Tanggal masa depan dinonaktifkan.</small>
          </label>
          <label>
            <span>Nomor nota dari buku</span>
            <input
              className={duplicate ? "input-error" : ""}
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              placeholder="BUKU-291026-01"
              value={note}
            />
            {duplicate && (
              <small className="error-text">Nomor nota sudah dipakai</small>
            )}
          </label>
        </div>
      </section>
      <section className="panel form-panel">
        <div className="section-title">
          <h3>Item dan kapster</h3>
          <Button className="secondary-button">
            <Icon name="plus" /> Tambah baris
          </Button>
        </div>
        {["Haircut", "Shaving"].map((x, i) => (
          <div className="manual-row" key={x}>
            <span>{i + 1}</span>
            <select defaultValue={x}>
              <option>Haircut</option>
              <option>Shaving</option>
              <option>Treatment</option>
            </select>
            <select>
              <option>{i ? "Tatas" : "Seva"}</option>
              <option>Faisal</option>
              <option>Fadhil</option>
              <option>Ferdi</option>
            </select>
            <input defaultValue="1" type="number" />
            <strong>{i ? "Rp 25.000" : "Rp 40.000"}</strong>
            <Button>
              <Icon name="trash" />
            </Button>
          </div>
        ))}
      </section>
      <section className="panel form-panel">
        <h3>Pembayaran</h3>
        <div className="payment-form-row">
          <div className="segmented">
            <Button className="active">Tunai</Button>
            <Button>QRIS</Button>
            <Button>Gabungan</Button>
          </div>
          <div className="input-shell">
            <b>Rp</b>
            <input defaultValue="65000" />
          </div>
          <div className="manual-total">
            <small>Total transaksi</small>
            <strong>Rp 65.000</strong>
          </div>
        </div>
      </section>
      <div className="sticky-submit">
        <span>
          <b>MANUAL</b> Akan ditandai di Riwayat dan laporan.
        </span>
        <Button
          className="primary-button"
          disabled={duplicate || note.length < 6}
        >
          Simpan rekap manual
        </Button>
      </div>
    </div>
  )
}

export default ManualPage
