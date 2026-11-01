import { KapsterDashboard } from "../shared/KapsterDashboard"
import { AppUser } from "../../types"

export function BerandaKapster({
  user,
  onNavigate,
  navigate,
}: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  return (
    <KapsterDashboard
      user={user}
      onNavigate={onNavigate}
      navigate={navigate}
    />
  )
}

export default BerandaKapster
