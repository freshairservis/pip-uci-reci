/* Пип учи речи: service worker.
 * Template: tools/build_web.py fills in the three double-underscore placeholders below and writes site/sw.js.
 * Offline-first: the small app shell is precached on install into a cache named after the build; the voice clips and
 * Pip's sheets (content-hashed URLs) live in the long-lived ASSETS cache, filled by the page (offline.js) in the
 * background and by this worker whenever the game asks for one. A new build means a new sw.js (new id) -> new shell
 * cache -> old shell caches are removed on activate; ASSETS stays, so an update downloads only changed files. The fonts (assets/fonts/, hashed URLs) are part of the shell: precached, no request to Google. */
"use strict";
const VERSION = "88db876a";
const CACHE = "pip-" + VERSION;
const ASSETS = "pip-assets-v1";   /* voice clips + Pip sheets, content-hashed URLs (?v=): shared with offline.js, kept across builds */
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "content.js?v=9eeffdc0f0",
  "audio-index.js?v=6ac135e870",
  "emoji.js?v=406bfadbc3",
  "doread.js?v=e56f4262ef",
  "music.js?v=853244dc00",
  "write.js?v=96c1961330",
  "pipsprite.js?v=0a0e464202",
  "story.js?v=05e22505cf",
  "stats.js?v=b1fcb6e52c",
  "offline.js?v=84ccbbcd25",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "assets/fonts/andika-cyrillic-400-normal.woff2?v=e47365ddff",
  "assets/fonts/andika-cyrillic-700-normal.woff2?v=19c12d02bd",
  "assets/fonts/andika-latin-400-normal.woff2?v=dd6bb7266c",
  "assets/fonts/andika-latin-700-normal.woff2?v=61c90acb5f",
  "assets/fonts/rubik-cyrillic-500-normal.woff2?v=b74a755840",
  "assets/fonts/rubik-cyrillic-700-normal.woff2?v=e82a4d4fd1",
  "assets/fonts/rubik-latin-500-normal.woff2?v=54ad302324",
  "assets/fonts/rubik-latin-700-normal.woff2?v=e423f8ae16",
  "qr.png",
  "privatnost.html",
  "proba.html",
  "vodic.html",
  "assets/pip/pip.json"
];
const abs = u => new URL(u, self.registration.scope).href;
/* /studio/ is a separate page ("Pip studio", recording tool) with its own worker: the game's worker never answers it,
 * so the studio can't be served stale from the game's cache and the game's offline behaviour stays as it was */
const STUDIO = new URL("studio", self.registration.scope).pathname;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* cache:"reload" skips the browser's HTTP cache (GitHub Pages sends max-age=600) so we never store a stale copy */
    await c.addAll(PRECACHE.map(u => new Request(abs(u), { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("pip-") && k !== CACHE && k !== ASSETS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    if (u.pathname === STUDIO || u.pathname.startsWith(STUDIO + "/")) return;
    e.respondWith(local(r));
  }
});

/* same origin: cache first (shell or assets), then network (and remember what the network gave us) */
async function local(r) {
  const u = new URL(r.url);
  const asset = u.searchParams.has("v") && /\/(audio|assets(?!\/fonts))\//.test(u.pathname);
  const c = await caches.open(asset ? ASSETS : CACHE);
  let hit = await c.match(r);
  if (!hit && !asset) hit = await caches.match(r);
  /* any page address inside the scope -> the app, except the plain pages next to it (vodic.html, privatnost.html…) */
  const page = /\.html$/.test(u.pathname) && !/\/index\.html$/.test(u.pathname);
  if (!hit && r.mode === "navigate" && !page) hit = await (await caches.open(CACHE)).match(abs("index.html"));
  if (hit) return hit;
  try {
    const res = await fetch(r);
    if (res && res.ok && res.type === "basic" && !r.headers.has("range")) c.put(r, res.clone());
    return res;
  } catch (err) {
    return new Response("Нема интернета.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
