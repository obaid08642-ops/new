/**
 * N9: Web Push service worker.
 *
 * Handles push events from the VAPID backend and shows notifications.
 * The subscription is created client-side and sent to /api/push/web/subscribe.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'نَبْض', body: event.data.text() };
  }

  const title = data.title || 'نَبْض';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'nabd',
    // backend push.module deliverWebPush sends { title, body, data: { url, ... } }; url is the web page of the target.
    data: { url: data.url || (data.data && data.data.url) || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) return client.navigate(url).then((c) => (c || client).focus());
      }
      return clients.openWindow(url);
    })
  );
});

// journeys#77: the site's own offline page. Only that page (one per locale) and its stylesheets are cached; every
// other request goes to the network as before, and a page is served from the cache only when its navigation fails.
const OFFLINE_CACHE = 'nabd-offline-v1';
const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

async function cacheOfflinePages() {
  const cache = await caches.open(OFFLINE_CACHE);
  for (const locale of LOCALES) {
    const url = `/${locale}/offline`;
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await cache.put(url, res);
      const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]).filter((href) => href.startsWith('/'));
      await Promise.all(sheets.map((href) => cache.add(href).catch(() => undefined)));
    } catch {
      // offline at install: the next install tries again
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheOfflinePages().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('nabd-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const first = url.pathname.split('/')[1];
    const locale = LOCALES.includes(first) ? first : 'ar';
    event.respondWith(fetch(request).catch(async () => (await caches.match(`/${locale}/offline`)) || Response.error()));
    return;
  }
  // the offline page's own stylesheets, from the cache only when the network fails
  if (request.destination === 'style') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || Response.error()));
  }
});
