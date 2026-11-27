import { ProductReportsPage } from "../shared/ProductReportsPage"
import { AppUser } from "../../types"

export function LaporanProduk({ currentUser, onNavigate }: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  return <ProductReportsPage currentUser={currentUser} role="Owner" onNavigate={onNavigate} />
}

export default LaporanProduk
