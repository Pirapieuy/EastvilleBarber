import { CashierPage } from "../shared/CashierPage"
import { AppUser } from "../../types"

export function KasirPOS({
  currentUser,
  onNavigate,
}: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  return <CashierPage currentUser={currentUser} onNavigate={onNavigate} />
}

export default KasirPOS
