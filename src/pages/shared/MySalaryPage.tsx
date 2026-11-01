import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"
import { IconName } from "../../types"

export function MySalaryPage() {
  return (
    <div className="mobile-content">
      <PageTitle
        eyebrow="Pendapatan pribadi"
        title="Gaji Saya"
        action={
          <Button className="secondary-button">
            <Icon name="calendar" />
            16–31 Okt
          </Button>
        }
      />
      <article className="my-salary-hero">
        <span>Komisi periode ini</span>
        <strong>Rp 2.090.000</strong>
        <p>47 pelanggan · 16–31 Oktober</p>
        <i>
          <b />
        </i>
        <small>Dihitung server saat gaji dibayar</small>
      </article>
      <section className="panel salary-breakdown">
        <PageTitle eyebrow="Perincian periode" title="Rincian pendapatan" />
        {[
          ["cashier", "Komisi layanan", 1880000],
          ["product", "Komisi produk", 210000],
          ["minus", "Potongan kasbon", -350000],
          ["wallet", "Sisa kasbon", 0],
        ].map((x) => (
          <div key={String(x[1])}>
            <span>
              <Icon name={x[0] as IconName} />
            </span>
            <strong>{x[1]}</strong>
            <b>
              {Number(x[2]) < 0
                ? `− ${rupiah(Math.abs(Number(x[2])))}`
                : rupiah(Number(x[2]))}
            </b>
          </div>
        ))}
        <footer>
          <span>Estimasi diterima</span>
          <strong>Rp 1.740.000</strong>
        </footer>
      </section>
      <section className="panel customer-list">
        <PageTitle
          eyebrow="Hari ini · 29 Okt"
          title="Pelanggan yang dikerjakan"
        />
        {[
          ["10.24", "Haircut", 16000],
          ["11.08", "Haircut + Cuci", 20000],
          ["12.42", "Shaving", 10000],
          ["14.16", "Treatment", 24000],
          ["16.37", "Free Style Dust", 10000],
        ].map((x) => (
          <div key={x[0]}>
            <span>{x[0]}</span>
            <i>
              <Icon name={x[1] === "Free Style Dust" ? "product" : "cashier"} />
            </i>
            <strong>{x[1]}</strong>
            <b>+{rupiah(Number(x[2]))}</b>
          </div>
        ))}
      </section>
      <div className="privacy">
        <Icon name="lock" /> Hanya data komisi dan transaksi milik akun Anda
        yang ditampilkan.
      </div>
    </div>
  )
}

export default MySalaryPage
