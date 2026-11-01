import { ProductReportsPage } from "../shared/ProductReportsPage"
import { AppUser } from "../../types"

export function LaporanProduk({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return <ProductReportsPage currentUser={currentUser} role="Owner" />
}

export default LaporanProduk
