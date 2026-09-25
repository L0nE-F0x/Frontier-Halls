/* Frontier Halls shell.
 * Navigations try the network first, so the next open is the latest deploy.
 * Hashed files under /assets are kept after they have been fetched once,
 * which is what lets the installed app open when the phone is offline.
 * Registered only from a production build.
 */
const CACHE = "frontier-halls-shell-1";

const EXTRA = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(fromNetwork(request, true));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(fromCache(request));
    return;
  }
  event.respondWith(fromNetwork(request, false));
});

async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch("/index.html", { cache: "no-store" });
  if (!page.ok) return;
  const html = await page.text();
  await cache.put("/index.html", new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }));

  const urls = new Set(EXTRA);
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) urls.add(match[1]);
  const cssUrls = [...urls].filter((url) => url.endsWith(".css"));
  await Promise.all([...urls].filter((url) => !url.endsWith(".css")).map((url) => put(cache, url)));
  await Promise.all(cssUrls.map((url) => cacheStyle(cache, url)));
}

async function cacheStyle(cache, url) {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status !== 200) return;
  const css = await res.clone().text();
  await cache.put(url, res);
  const fonts = [...css.matchAll(/url\((?:'|")?(\/assets\/[^)'"]+)/g)].map((match) => match[1]);
  await Promise.all(fonts.map((font) => put(cache, font)));
}

async function put(cache, url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 200) await cache.put(url, res);
  } catch {
    // One missing file must not keep the app from installing.
  }
}

async function fromNetwork(request, navigation) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.status === 200) await cache.put(navigation ? "/index.html" : request, res.clone());
    return res;
  } catch {
    if (navigation) {
      const shell = await cache.match("/index.html");
      if (shell) return shell;
      return offlinePage();
    }
    return (await cache.match(request)) || Response.error();
  }
}

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.status === 200) await cache.put(request, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}

function offlinePage() {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Frontier Halls</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#d6d2cc;color:#201e24;font:21px Georgia,serif;text-align:center;padding:32px"><p>The halls are offline.<br>Open them again once you are connected.</p>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
