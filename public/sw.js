/* iesales.ie service worker: offline shell + fast repeat loads.
   Never caches API calls (Supabase) or auth routes. */
const VERSION = "v2";
const SHELL = `iesales-shell-${VERSION}`;
const ASSETS = `iesales-assets-${VERSION}`;
const FEED = `iesales-feed-${VERSION}`;
const SHELL_URLS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, ASSETS, FEED].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google, etc.
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin")) return;

  // Stale-while-revalidate for the public feed: instant repeat opens, and the last good
  // copy is still shown when the network or backend is down. Fresh reads (?fresh=) skip the cache.
  if (url.pathname === "/api/feed" && !url.searchParams.has("fresh")) {
    event.respondWith(
      caches.open(FEED).then(async (cache) => {
        const hit = await cache.match("/api/feed");
        const network = fetch(req).then((res) => {
          if (res.ok) cache.put("/api/feed", res.clone());
          return res;
        });
        if (hit) { network.catch(() => undefined); return hit; }
        return network.catch(() => hit || new Response('{"error":"offline"}', { status: 503, headers: { "Content-Type": "application/json" } }));
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
  }
});
