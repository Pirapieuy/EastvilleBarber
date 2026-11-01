import { ManagerDashboard } from "../shared/ManagerDashboard"
import { AppUser } from "../../types"

export function BerandaManajer({
  user,
  onNavigate,
  navigate,
}: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  return (
    <ManagerDashboard
      user={user}
      onNavigate={onNavigate}
      navigate={navigate}
    />
  )
}

export default BerandaManajer
