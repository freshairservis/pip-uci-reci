/* Pip studio: service worker of the recording page (scope: this folder only, more specific than the game's worker).
 * Template: tools/build_web.py fills in the two double-underscore placeholders and writes site/studio/sw.js.
 * Network-first: while online the page and its items always come fresh from the server (never a stale studio page);
 * the last good copy is only the fallback when the phone has no connection, so the studio still opens offline.
 * Google Fonts are answered from the cache at once and refreshed in the background. */
"use strict";
const VERSION = "0abd165d";
const PAGES = "studio-pages-" + VERSION;
const FONTS = "studio-fonts-v1";
const PRECACHE = [
  "./",
  "index.html",
  "items.js?v=00cec1c87b"
];
const abs = u => new URL(u, self.registration.scope).href;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(PAGES);
    await c.addAll(PRECACHE.map(u => new Request(abs(u), { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("studio-pages-") && k !== PAGES) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) e.respondWith(networkFirst(r));
  else if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") e.respondWith(swr(e, r));
});

async function networkFirst(r) {
  const c = await caches.open(PAGES);
  try {
    const res = await fetch(new Request(r.url, { cache: "no-cache", credentials: "same-origin" }));
    if (res && res.ok && res.type === "basic") c.put(r.url, res.clone());
    return res;
  } catch (err) {
    let hit = await c.match(r.url);
    if (!hit && r.mode === "navigate") hit = await c.match(abs("index.html"), { ignoreSearch: true });
    return hit || new Response("Nema interneta, a ova stranica još nije sačuvana na telefonu.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function swr(e, r) {
  const c = await caches.open(FONTS);
  const hit = await c.match(r, { ignoreVary: true });
  const net = fetch(r).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || Response.error();
}
