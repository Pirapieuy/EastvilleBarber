import { CalendarPicker } from "./CalendarPicker"
import { Button } from "./UI"
import {
  labelPeriode,
  ModePeriode,
  PeriodeTersimpan,
  TANGGAL_MAKS,
  TANGGAL_MULAI,
} from "../../utils/tanggal"

const MODE: ModePeriode[] = ["Harian", "Mingguan", "Bulanan"]

/** Pemilih tanggal dengan tombol Harian/Mingguan/Bulanan, sama di semua halaman filter tanggal. */
export function PeriodePicker({
  periode,
  onMode,
  onTanggal,
  style,
}: {
  periode: PeriodeTersimpan
  onMode: (mode: ModePeriode) => void
  onTanggal: (tanggal: string) => void
  style?: React.CSSProperties
}) {
  return (
    <CalendarPicker
      value={periode.tanggal}
      label={labelPeriode(periode.mode, periode.tanggal)}
      bulanSaja={periode.mode === "Bulanan"}
      popupHeader={
        <div className="segmented history-periode" role="group" aria-label="Periode">
          {MODE.map((m) => (
            <Button
              className={periode.mode === m ? "active" : ""}
              key={m}
              type="button"
              onClick={() => onMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      }
      onChange={onTanggal}
      allowClear
      clearLabel="Semua Tanggal"
      placeholder="Semua Tanggal"
      max={TANGGAL_MAKS()}
      min={TANGGAL_MULAI}
      style={style}
    />
  )
}
