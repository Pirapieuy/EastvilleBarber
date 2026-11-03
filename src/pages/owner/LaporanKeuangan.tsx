import { ReportsPage } from "../shared/ReportsPage"
import { AppUser } from "../../types"

export function LaporanKeuangan({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return <ReportsPage currentUser={currentUser} role="Owner" />
}

export default LaporanKeuangan
