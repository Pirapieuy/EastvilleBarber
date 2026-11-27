// Service worker Eastville: menyimpan cangkang aplikasi (HTML/JS/CSS/ikon) agar bisa dipasang dan terbuka cepat.
// Panggilan API TIDAK pernah disimpan: data selalu dari server, supaya angka kasir tidak basi.
const VERSI = "eastville-v2"
const CANGKANG = new URL("./", self.location).href // alamat halaman utama (mengikuti subfolder tempat aplikasi di-host)

self.addEventListener("install", (e) => {
  // Simpan cangkang saat pasang supaya pemakaian offline pertama sudah siap.
  e.waitUntil(caches.open(VERSI).then((c) => c.add(CANGKANG)).catch(() => {}).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => n !== VERSI).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

async function simpan(req, res) {
  const c = await caches.open(VERSI)
  await c.put(req, res)
}

self.addEventListener("fetch", (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== self.location.origin) return // API Supabase = lintas asal, lewat saja

  // Halaman: ambil dari jaringan dulu (selalu versi terbaru); offline -> cangkang tersimpan.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) e.waitUntil(simpan(CANGKANG, res.clone()))
          return res
        })
        .catch(() => caches.match(CANGKANG).then((r) => r || Response.error())),
    )
    return
  }
  // Berkas bernama hash (assets/...): simpan, lalu pakai salinan tersimpan bila ada.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) e.waitUntil(simpan(req, res.clone()))
        return res
      }),
    ),
  )
})
