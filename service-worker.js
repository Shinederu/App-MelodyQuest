const RELEASE = "20260904-pwa-manifest";
const CACHE_PREFIX = "melodyquest-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${RELEASE}`;
const ASSET_INDEX_URL = `/pwa-assets.json?v=${RELEASE}`;
const CORE_ASSETS = [
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/pwa-assets.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch(ASSET_INDEX_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("PWA asset index unavailable");
    }

    const assetIndex = await response.json();
    if (assetIndex.version !== RELEASE || !Array.isArray(assetIndex.assets)) {
      throw new Error("PWA asset index version mismatch");
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set([...CORE_ASSETS, ...assetIndex.assets])]);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fetchNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return caches.match("/index.html");
  }
}

async function fetchStaticAsset(request) {
  const cacheKey = new URL(request.url).pathname;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey, response.clone());
      return response;
    }

    return await caches.match(cacheKey) || response;
  } catch {
    return await caches.match(cacheKey) || new Response("", {
      status: 503,
      statusText: "Offline",
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetchNavigation(request));
    return;
  }

  const isStaticAsset = (
    url.pathname.startsWith("/assets/") ||
    CORE_ASSETS.includes(url.pathname)
  );
  if (isStaticAsset) {
    event.respondWith(fetchStaticAsset(request));
  }
});
