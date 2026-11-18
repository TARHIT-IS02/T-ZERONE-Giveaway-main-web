/* =====================================================================================
   T ZERONE — SERVICE WORKER (offline-first asset shell)
   Pairs with the localStorage live-data fallback in script.js: that cache renders
   stale-but-correct Firestore data with no connection, while this worker caches the page
   shell (HTML / CSS / JS / fonts / images) so a repeat visit loads instantly, even offline.

   FIRESTORE SAFETY: every Firestore / Firebase / auth / analytics host is bypassed in
   shouldBypass() and is never cached, served from cache, or otherwise touched — that
   traffic always goes straight to the network.
===================================================================================== */

/* =====================================================================================
   CONFIGURATION
   Bump SHELL_CACHE_NAME whenever index.html / styles.css / script.js change: activation
   deletes every older cache, so returning visitors never get stuck on an outdated shell.
===================================================================================== */

const SHELL_CACHE_NAME = "tzerone-shell-v7";
const MAX_RUNTIME_ENTRIES = 150;            // cap for non-precached assets (admin-uploaded images etc.)
const IMAGE_BASE = "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/";

// Same-origin shell + the critical assets referenced by index.html and script.js.
const PRECACHE_URLS = [
    "./",
    "index.html",
    "styles.css",
    "script.js",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap",
    IMAGE_BASE + "TZERONE_OFFICIAL_LOGO.png",
    IMAGE_BASE + "gift_giveaway_bb.png",
    IMAGE_BASE + "event_end_bb.png",
    IMAGE_BASE + "barbarian_thinking.png",
    IMAGE_BASE + "barbarian_thumbsup.png",
    IMAGE_BASE + "barbarian_holding_prize.png",
    IMAGE_BASE + "Submitted_page_barbarian_thumbsup.png",
    IMAGE_BASE + "Game/clash_blade_official_icon_T01.jpeg",
    "https://raw.githubusercontent.com/TARHIT-IS02/all-images/refs/heads/main/fav-icon-main-logo-rounded-square.png"
];

// Firestore / Firebase live data, auth and analytics — always network-only.
const NEVER_INTERCEPT_HOSTS = [
    "firestore.googleapis.com",
    "firebaseinstallations.googleapis.com",
    "firebaselogging-pa.googleapis.com",
    "firebaseappcheck.googleapis.com",
    "content-firebaseappcheck.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "www.googleapis.com",
    "firebase.googleapis.com",
    "google-analytics.com",
    "www.google-analytics.com",
    "analytics.google.com"
];

/* =====================================================================================
   HELPERS
===================================================================================== */

function shouldBypass(url) {
    return NEVER_INTERCEPT_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
}

// Only complete, cacheable answers are stored: 206 (range) responses make cache.put()
// throw, and error pages must never replace a good cached copy.
function isCacheable(res) {
    return !!res && (res.status === 200 || res.type === "opaque");
}

// Keeps runtime (non-precached) entries bounded — oldest entries are evicted first.
async function trimRuntimeEntries(cache) {
    const keys = await cache.keys();
    const precached = new Set(PRECACHE_URLS.map(u => new URL(u, self.location).href));
    const runtime = keys.filter(req => !precached.has(req.url));
    const overflow = runtime.length - MAX_RUNTIME_ENTRIES;
    for (let i = 0; i < overflow; i++) await cache.delete(runtime[i]);
}

/* =====================================================================================
   INSTALL — best-effort precache
   Per-resource, so one failed cross-origin fetch never aborts the whole install.
   Same-origin shell files bypass the HTTP cache so a new deploy is never precached stale.
===================================================================================== */

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE_NAME).then((cache) =>
            Promise.allSettled(
                PRECACHE_URLS.map((url) => {
                    const isSameOrigin = new URL(url, self.location).origin === self.location.origin;
                    const request = new Request(url, { mode: "cors", cache: isSameOrigin ? "reload" : "default" });
                    return fetch(request)
                        .then((res) => (res && res.ok ? cache.put(url, res) : undefined))
                        .catch(() => {});
                })
            )
        ).then(() => self.skipWaiting())
    );
});

/* =====================================================================================
   ACTIVATE — drop old caches, take control immediately
===================================================================================== */

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

/* =====================================================================================
   FETCH — stale-while-revalidate
   Serves instantly from cache when available (this is what makes the shell load with zero
   connection) while re-fetching in the background to refresh the cache for next time.
===================================================================================== */

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    if (url.protocol !== "http:" && url.protocol !== "https:") return;   // extensions, blob:, etc.
    if (shouldBypass(url)) return;                                        // Firestore/Firebase: never touched
    if (req.headers.has("range")) return;                                 // media/range requests go straight through
    if (url.search.indexOf("_tzretry=") !== -1) return;                   // script.js image retry: must hit the network

    const isNavigation = req.mode === "navigate";

    event.respondWith(
        caches.open(SHELL_CACHE_NAME).then(async (cache) => {
            // Navigations ignore the query string (?fbclid=…, ?utm_…) so shared links still hit the shell.
            const cached = await cache.match(req, isNavigation ? { ignoreSearch: true } : undefined);

            const networkFetch = fetch(req)
                .then((res) => {
                    if (isCacheable(res)) {
                        cache.put(req, res.clone())
                            .then(() => (url.origin === self.location.origin ? undefined : trimRuntimeEntries(cache)))
                            .catch(() => {});
                    }
                    return res;
                })
                .catch(async () => {
                    if (cached) return cached;
                    // Offline navigation with nothing cached for this exact URL: fall back to the app shell.
                    if (isNavigation) return (await cache.match("index.html")) || (await cache.match("./"));
                    return Response.error();
                });

            // Keep the worker alive until the background refresh has finished writing the cache.
            event.waitUntil(networkFetch.catch(() => {}));

            return cached || networkFetch;
        })
    );
});
