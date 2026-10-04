// Kochavim service worker: cache the app shell and the current Island's
// assets so play continues on a flaky connection or a car ride.
const CACHE = "kochavim-v4";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (c) => {
        await c.addAll(SHELL);
        // Emoji art (~0.8 MB) and the recorded voice pack (~2 MB) are small:
        // keep all of it for offline play.
        for (const manifest of ["/emoji/manifest.json", "/voice/manifest.json"]) {
          const list = await fetch(manifest).then((r) => r.json()).catch(() => []);
          await c.addAll(list).catch(() => {});
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Neural speech clips never change for a URL: cache-first, so voices work offline.
  if (req.url.includes("/api/tts")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  // Other API calls and Vercel Analytics always go to the network.
  if (req.url.includes("/api/") || req.url.includes("/_vercel/")) return;

  // Network first for navigations (fresh lessons), cache fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Stale-while-revalidate for static assets.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
