/* =====================================================================================
   T ZERONE — SERVICE WORKER (offline-first asset shell)
   Pairs with the existing localStorage live-data fallback in script.js: that cache lets
   a repeat visit render stale-but-correct Firestore data with no connection, but the
   page shell itself (HTML/CSS/JS/fonts/images) still had to come over the network first.
   This worker caches that shell so a repeat visit loads instantly even with zero
   connectivity.

   FIRESTORE SAFETY: every Firestore/Firebase/auth/analytics host is explicitly bypassed
   in shouldBypass() below and is never cached, served-from-cache, or otherwise touched —
   that traffic always goes straight to the network exactly as it did before this file
   existed.
===================================================================================== */

const SHELL_CACHE_NAME = "tzerone-shell-v1";

// The app shell files plus the same critical assets already <link rel="preload">-ed in
// index.html's <head> (logo, hero image, and the three mascot images).
const PRECACHE_URLS = [
    "./",
    "index.html",
    "styles.css",
    "script.js",
    "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap",
    "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/TZERONE_OFFICIAL_LOGO.png",
    "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/gift_giveaway_bb.png",
    "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/barbarian_thinking.png",
    "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/barbarian_thumbsup.png",
    "https://raw.githubusercontent.com/TARHIT-T0SVX/All-image-t-z/refs/heads/main/barbarian_holding_prize.png"
];

// Any request to one of these hosts is Firestore/Firebase live data, auth, or analytics
// traffic — always network-only, never cached or intercepted.
const NEVER_INTERCEPT_HOSTS = [
    "firestore.googleapis.com",
    "firebaseinstallations.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "www.googleapis.com",
    "firebase.googleapis.com",
    "google-analytics.com",
    "www.google-analytics.com",
    "analytics.google.com"
];

function shouldBypass(url) {
    return NEVER_INTERCEPT_HOSTS.some(host => url.hostname === host || url.hostname.endsWith("." + host));
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE_NAME).then((cache) => {
            // Best-effort, per-resource: a single failed cross-origin fetch (e.g. a
            // transient network issue during install) must never abort the whole
            // install and leave the rest of the shell uncached.
            return Promise.allSettled(
                PRECACHE_URLS.map((url) =>
                    fetch(url, { mode: "cors" })
                        .then((res) => {
                            if (res && (res.ok || res.type === "opaque")) return cache.put(url, res);
                        })
                        .catch(() => {})
                )
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Hard bypass: Firestore/Firebase/auth/analytics traffic is never touched by this
    // worker, in either direction.
    if (shouldBypass(url)) return;

    // Stale-while-revalidate: serve instantly from cache when available (this is what
    // makes the shell load with zero connection), while always re-fetching in the
    // background to refresh the cache for the next visit. Falls back to the network
    // fetch itself when there's nothing cached yet.
    event.respondWith(
        caches.open(SHELL_CACHE_NAME).then((cache) =>
            cache.match(req).then((cachedResponse) => {
                const networkFetch = fetch(req)
                    .then((networkResponse) => {
                        if (networkResponse && (networkResponse.ok || networkResponse.type === "opaque")) {
                            cache.put(req, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);
                return cachedResponse || networkFetch;
            })
        )
    );
});
