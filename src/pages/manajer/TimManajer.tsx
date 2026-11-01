import { TeamPage } from "../shared/TeamPage"
import { AppUser } from "../../types"

export function TimManajer({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return (
    <TeamPage
      currentUser={currentUser}
      role="Manajer"
      title="Tim Manajer"
    />
  )
}

export default TimManajer
