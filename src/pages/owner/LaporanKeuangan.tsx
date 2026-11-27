import { ReportsPage } from "../shared/ReportsPage"
import { AppUser } from "../../types"

export function LaporanKeuangan({ currentUser, onNavigate }: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  return (
    <ReportsPage currentUser={currentUser} role="Owner" onNavigate={onNavigate} />
  )
}

export default LaporanKeuangan
