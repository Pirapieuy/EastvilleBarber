import { MySalaryPage } from "../shared/MySalaryPage"
import { AppUser } from "../../types"

export function GajiKomisiSaya({ currentUser }: { currentUser: AppUser }) {
  return <MySalaryPage currentUser={currentUser} />
}

export default GajiKomisiSaya
