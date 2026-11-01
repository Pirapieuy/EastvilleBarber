import { OwnerDashboard } from "../shared/OwnerDashboard"

export function BerandaOwner({
  onNavigate,
  navigate,
}: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  return <OwnerDashboard onNavigate={onNavigate} navigate={navigate} />
}

export default BerandaOwner
