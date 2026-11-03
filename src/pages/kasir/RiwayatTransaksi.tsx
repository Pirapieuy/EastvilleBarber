import { HistoryPage } from "../shared/HistoryPage"
import { AppUser } from "../../types"

export function RiwayatTransaksi({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return <HistoryPage currentUser={currentUser} role="Kasir" />
}

export default RiwayatTransaksi
