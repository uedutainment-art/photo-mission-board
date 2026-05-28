importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

const CACHE_NAME = "photo-mission-board-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon.svg", "/icons/maskable-icon.svg"];

firebase.initializeApp({
  apiKey: "AIzaSyC8VYUoAkimq7pqlanK8slXg1Iz4Uo8gS8",
  authDomain: "photo-mission-board-prod.firebaseapp.com",
  projectId: "photo-mission-board-prod",
  storageBucket: "photo-mission-board-prod.firebasestorage.app",
  messagingSenderId: "592209901813",
  appId: "1:592209901813:web:175c65fbbf38a8a0886dbc",
  measurementId: "G-BSMB914NL7",
});

const messaging = firebase.messaging();

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }

            return response;
          })
          .catch(() => cached);

        return cached || fetched;
      }),
    ),
  );
});

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Photo Mission Board";
  const body = payload.notification?.body || payload.data?.body || "새 활동이 있습니다.";
  const link = payload.fcmOptions?.link || payload.data?.link || "/events";

  self.registration.showNotification(title, {
    body,
    icon: payload.notification?.icon || "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  const link = event.notification.data?.link || "/events";

  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetUrl = new URL(link, self.location.origin).href;

      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});
