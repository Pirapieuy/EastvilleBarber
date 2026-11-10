import { getToken } from "../../api"

/**
 * Peringatan saat halaman memakai data demo (tidak tersambung ke server).
 * Tanpa ini kegagalan memuat data terlihat seperti aplikasi normal padahal
 * transaksinya tidak tersimpan.
 */
export function DemoNotice({ live, error }: { live: boolean; error?: string }) {
  if (live) return null
  // Sudah login ke server dan belum ada error = data masih dimuat, bukan mode demo.
  if (!error && getToken()) return null

  let helpText = ""
  if (error) {
    if (error.includes("token tidak ada") || error.includes("belum login")) {
      helpText =
        "Mode latihan offline. Silakan login untuk menyimpan data ke sistem."
    } else if (
      error.includes("Gagal terhubung") ||
      error.includes("Failed to fetch") ||
      error.includes("NetworkError") ||
      error.includes("gagal memuat data")
    ) {
      helpText =
        "Koneksi internet terputus. Gunakan menu 'Input Nota Kertas' untuk mencatat nota fisik."
    } else {
      helpText = `Status: ${error}`
    }
  }

  return (
    <div
      role="alert"
      style={{
        margin: "0 0 12px",
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid #e0a800",
        background: "#fff7e0",
        color: "#6b4f00",
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <strong>Mode demo</strong> — data transaksi pada sesi ini{" "}
      <strong>tidak tersimpan</strong> ke server.
      {helpText && <span> {helpText}</span>}
    </div>
  )
}
