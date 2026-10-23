/* Пип учи речи: service worker.
 * Template: tools/build_web.py fills in the three double-underscore placeholders below and writes site/sw.js.
 * Offline-first: everything is precached on install into a cache named after the build, so the game opens and plays
 * with no internet after the first visit. A new build means a new sw.js (new id) -> new cache -> old caches are removed
 * on activate. Google Fonts are cached at runtime (stale-while-revalidate) in a separate, long-lived cache. */
"use strict";
const VERSION = "85dcd231";
const CACHE = "pip-" + VERSION;
const FONTS = "pip-fonts-v1";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "content.js?v=5853dab0a6",
  "audio.js?v=78b721730d",
  "write.js?v=2a65dc20bf",
  "pipsprite.js?v=06ab8e54c1",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "qr.png",
  "assets/pip/backpack_dance.webp",
  "assets/pip/backpack_eat.webp",
  "assets/pip/backpack_giggle.webp",
  "assets/pip/backpack_happy.webp",
  "assets/pip/backpack_idle.webp",
  "assets/pip/backpack_listen.webp",
  "assets/pip/backpack_sleeping.webp",
  "assets/pip/backpack_sleepy.webp",
  "assets/pip/backpack_thinking.webp",
  "assets/pip/backpack_wave.webp",
  "assets/pip/backpack_yuck.webp",
  "assets/pip/backpack_yum.webp",
  "assets/pip/body_dance.webp",
  "assets/pip/body_eat.webp",
  "assets/pip/body_giggle.webp",
  "assets/pip/body_happy.webp",
  "assets/pip/body_idle.webp",
  "assets/pip/body_listen.webp",
  "assets/pip/body_sleeping.webp",
  "assets/pip/body_sleepy.webp",
  "assets/pip/body_thinking.webp",
  "assets/pip/body_wave.webp",
  "assets/pip/body_yuck.webp",
  "assets/pip/body_yum.webp",
  "assets/pip/bow_dance.webp",
  "assets/pip/bow_eat.webp",
  "assets/pip/bow_giggle.webp",
  "assets/pip/bow_happy.webp",
  "assets/pip/bow_idle.webp",
  "assets/pip/bow_listen.webp",
  "assets/pip/bow_sleeping.webp",
  "assets/pip/bow_sleepy.webp",
  "assets/pip/bow_thinking.webp",
  "assets/pip/bow_wave.webp",
  "assets/pip/bow_yuck.webp",
  "assets/pip/bow_yum.webp",
  "assets/pip/cap_dance.webp",
  "assets/pip/cap_eat.webp",
  "assets/pip/cap_giggle.webp",
  "assets/pip/cap_happy.webp",
  "assets/pip/cap_idle.webp",
  "assets/pip/cap_listen.webp",
  "assets/pip/cap_sleeping.webp",
  "assets/pip/cap_sleepy.webp",
  "assets/pip/cap_thinking.webp",
  "assets/pip/cap_wave.webp",
  "assets/pip/cap_yuck.webp",
  "assets/pip/cap_yum.webp",
  "assets/pip/cape_dance.webp",
  "assets/pip/cape_eat.webp",
  "assets/pip/cape_giggle.webp",
  "assets/pip/cape_happy.webp",
  "assets/pip/cape_idle.webp",
  "assets/pip/cape_listen.webp",
  "assets/pip/cape_sleeping.webp",
  "assets/pip/cape_sleepy.webp",
  "assets/pip/cape_thinking.webp",
  "assets/pip/cape_wave.webp",
  "assets/pip/cape_yuck.webp",
  "assets/pip/cape_yum.webp",
  "assets/pip/crown_dance.webp",
  "assets/pip/crown_eat.webp",
  "assets/pip/crown_giggle.webp",
  "assets/pip/crown_happy.webp",
  "assets/pip/crown_idle.webp",
  "assets/pip/crown_listen.webp",
  "assets/pip/crown_sleeping.webp",
  "assets/pip/crown_sleepy.webp",
  "assets/pip/crown_thinking.webp",
  "assets/pip/crown_wave.webp",
  "assets/pip/crown_yuck.webp",
  "assets/pip/crown_yum.webp",
  "assets/pip/flower_dance.webp",
  "assets/pip/flower_eat.webp",
  "assets/pip/flower_giggle.webp",
  "assets/pip/flower_happy.webp",
  "assets/pip/flower_idle.webp",
  "assets/pip/flower_listen.webp",
  "assets/pip/flower_sleeping.webp",
  "assets/pip/flower_sleepy.webp",
  "assets/pip/flower_thinking.webp",
  "assets/pip/flower_wave.webp",
  "assets/pip/flower_yuck.webp",
  "assets/pip/flower_yum.webp",
  "assets/pip/glasses_dance.webp",
  "assets/pip/glasses_eat.webp",
  "assets/pip/glasses_giggle.webp",
  "assets/pip/glasses_happy.webp",
  "assets/pip/glasses_idle.webp",
  "assets/pip/glasses_listen.webp",
  "assets/pip/glasses_sleeping.webp",
  "assets/pip/glasses_sleepy.webp",
  "assets/pip/glasses_thinking.webp",
  "assets/pip/glasses_wave.webp",
  "assets/pip/glasses_yuck.webp",
  "assets/pip/glasses_yum.webp",
  "assets/pip/hat_dance.webp",
  "assets/pip/hat_eat.webp",
  "assets/pip/hat_giggle.webp",
  "assets/pip/hat_happy.webp",
  "assets/pip/hat_idle.webp",
  "assets/pip/hat_listen.webp",
  "assets/pip/hat_sleeping.webp",
  "assets/pip/hat_sleepy.webp",
  "assets/pip/hat_thinking.webp",
  "assets/pip/hat_wave.webp",
  "assets/pip/hat_yuck.webp",
  "assets/pip/hat_yum.webp",
  "assets/pip/pip.json",
  "assets/pip/scarf_dance.webp",
  "assets/pip/scarf_eat.webp",
  "assets/pip/scarf_giggle.webp",
  "assets/pip/scarf_happy.webp",
  "assets/pip/scarf_idle.webp",
  "assets/pip/scarf_listen.webp",
  "assets/pip/scarf_sleeping.webp",
  "assets/pip/scarf_sleepy.webp",
  "assets/pip/scarf_thinking.webp",
  "assets/pip/scarf_wave.webp",
  "assets/pip/scarf_yuck.webp",
  "assets/pip/scarf_yum.webp"
];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Rubik:wght@500;700&display=swap&subset=cyrillic";
const abs = u => new URL(u, self.registration.scope).href;
/* /studio/ is a separate page ("Pip studio", recording tool) with its own worker: the game's worker never answers it,
 * so the studio can't be served stale from the game's cache and the game's offline behaviour stays as it was */
const STUDIO = new URL("studio", self.registration.scope).pathname;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* cache:"reload" skips the browser's HTTP cache (GitHub Pages sends max-age=600) so we never store a stale copy */
    await c.addAll(PRECACHE.map(u => new Request(abs(u), { cache: "reload" })));
    try { await precacheFonts(); } catch (err) { /* fonts are optional: the game falls back to system fonts */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("pip-") && k !== CACHE && k !== FONTS) await caches.delete(k);
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
  else if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") e.respondWith(swr(e, r));
});

/* same origin: cache first, then network (and remember what the network gave us) */
async function local(r) {
  const c = await caches.open(CACHE);
  let hit = await c.match(r);
  if (!hit && r.mode === "navigate") hit = await c.match(abs("index.html"));   /* any page address inside the scope -> the app */
  if (hit) return hit;
  try {
    const res = await fetch(r);
    if (res && res.ok && res.type === "basic") c.put(r, res.clone());
    return res;
  } catch (err) {
    return new Response("Нема интернета.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

/* Google Fonts: answer from the cache at once, refresh it in the background */
async function swr(e, r) {
  const c = await caches.open(FONTS);
  const hit = await c.match(r, { ignoreVary: true });
  const net = fetch(r).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || Response.error();
}

/* the first visit is not yet controlled by this worker, so the page's own font requests bypass it: fetch the
 * stylesheet and the Cyrillic + Latin font files here so the second (offline) visit looks right */
async function precacheFonts() {
  if (!FONT_CSS) return;
  const c = await caches.open(FONTS);
  const res = await fetch(FONT_CSS, { mode: "cors" });
  if (!res.ok) return;
  const css = await res.clone().text();
  await c.put(FONT_CSS, res);
  for (const block of css.split("/*")) {
    const name = (block.match(/^\s*([\w-]+)\s*\*\//) || [])[1];
    if (name !== "cyrillic" && name !== "latin") continue;
    const m = block.match(/url\((https:[^)]+)\)/);
    if (!m) continue;
    try { const f = await fetch(m[1], { mode: "cors" }); if (f.ok) await c.put(m[1], f); } catch (err) { /* ignore */ }
  }
}
