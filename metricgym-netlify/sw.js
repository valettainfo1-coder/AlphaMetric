/* METRICGYM Service Worker — App-Shell offline + Installierbarkeit.
   Strategie: Navigationen network-first (frische Version), statische Assets
   cache-first. Fremde Hosts (Supabase/Groq/CDNs) werden NICHT angefasst. */
const CACHE = "metricgym-v1";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                         // POST (Supabase/Groq) durchlassen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Fremd-Hosts unangetastet
  if (req.mode === "navigate") {                            // HTML: frisch holen, sonst Cache
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy));
      return r;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r;
  }).catch(() => hit)));
});
