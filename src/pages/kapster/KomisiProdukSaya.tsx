import { ProductReportsPage } from "../shared/ProductReportsPage"
import { AppUser } from "../../types"

export function KomisiProdukSaya({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return <ProductReportsPage currentUser={currentUser} role="Kapster" />
}

export default KomisiProdukSaya
