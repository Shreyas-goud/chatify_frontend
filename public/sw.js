// Chatify's service worker: makes the app installable and opens it instantly from the home screen,
// shows push notifications, and reports what became of them (shown, swiped away, tapped), which
// Glass circles show to their members. Hashed build files are cached for good; pages come from
// the network, falling back to the last copy when offline. The API is never cached.
const SHELL = "chatify-shell-v2";
const ASSETS = "chatify-assets-v1";
const MAX_ASSETS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== ASSETS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy).then(() => trim(cache)));
            }
            return response;
          })
      )
    );
  }
});

// ── Notifications ─────────────────────────────────────────────────────────────

// Only circle messages and nudges are reported: that's what Glass members agreed to share.
function receipt(kind, data) {
  if (!data?.circleId && !data?.nudgeId) return Promise.resolve();
  return fetch("/api/attention", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, circleId: data.circleId, nudgeId: data.nudgeId }),
  }).catch(() => {});
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Chatify", body: event.data?.text() };
  }
  const nudge = data.type === "nudge";
  event.waitUntil(
    self.registration
      .showNotification(data.title || "Chatify", {
        body: data.body || "",
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data,
        requireInteraction: Boolean(data.requireInteraction),
        vibrate: nudge ? [120, 80, 120, 80, 260] : [70],
      })
      .then(() => receipt("shown", data))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || "/", self.location.origin).href;
  event.waitUntil(
    Promise.all([
      receipt("opened", data),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
        const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
        if (open) return open.navigate(target).then((w) => (w ?? open).focus());
        return self.clients.openWindow(target);
      }),
    ])
  );
});

// Swiped away or cleared without opening (Chrome and Android report this; iPhone may not).
self.addEventListener("notificationclose", (event) => {
  event.waitUntil(receipt("dismissed", event.notification.data || {}));
});
