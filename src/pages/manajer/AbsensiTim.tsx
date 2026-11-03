import { AttendanceAdminPage } from "../shared/AttendanceAdminPage"
import { AppUser } from "../../types"

export function AbsensiTim({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return (
    <AttendanceAdminPage
      currentUser={currentUser}
      role="Manajer"
      title="Absensi Tim"
    />
  )
}

export default AbsensiTim
