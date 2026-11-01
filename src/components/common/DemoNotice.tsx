/**
 * Peringatan saat halaman memakai data demo (tidak tersambung ke server).
 * Tanpa ini kegagalan memuat data terlihat seperti aplikasi normal padahal
 * transaksinya tidak tersimpan.
 */
export function DemoNotice({ live, error }: { live: boolean; error?: string }) {
  if (live) return null
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
      <strong>Mode demo</strong> — data ini <strong>tidak tersimpan</strong> ke server.
      {error ? ` Penyebab: ${error}` : ""}
    </div>
  )
}
