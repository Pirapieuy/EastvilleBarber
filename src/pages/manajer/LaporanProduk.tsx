import { ProductReportsPage } from "../shared/ProductReportsPage"
import { AppUser } from "../../types"

export function LaporanProduk({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return <ProductReportsPage currentUser={currentUser} role="Manajer" />
}

export default LaporanProduk
