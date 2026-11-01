import { TeamPage } from "../shared/TeamPage"
import { AppUser } from "../../types"

export function TimEastville({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return (
    <TeamPage
      currentUser={currentUser}
      role="Owner"
      title="Tim Eastville"
    />
  )
}

export default TimEastville
