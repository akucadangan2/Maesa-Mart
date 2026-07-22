const CACHE_NAME = "maesa-kasir-v1";
const URLS_TO_CACHE = ["/kasir", "/kasir/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Cuma tangani request GET biasa, khusus halaman Kasir + asset statis
  // Next.js-nya sendiri. Gak ganggu route lain (admin, order) atau request
  // ke Supabase/server lokal (yang butuh logic beda, bukan sekadar cache).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isKasirRelated =
    url.pathname.startsWith("/kasir") || url.pathname.startsWith("/_next/static");
  if (!isKasirRelated) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});