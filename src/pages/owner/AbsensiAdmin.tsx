import { AttendanceAdminPage } from "../shared/AttendanceAdminPage"
import { AppUser } from "../../types"

export function AbsensiAdmin({
  currentUser,
}: {
  currentUser?: AppUser
} = {}) {
  return (
    <AttendanceAdminPage
      currentUser={currentUser}
      role="Owner"
      title="Absensi"
    />
  )
}

export const JadwalAbsensi = AbsensiAdmin
export default AbsensiAdmin
