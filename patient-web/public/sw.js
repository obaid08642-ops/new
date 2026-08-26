/* nabdplus web-push service worker (parity #14)
 * Handles incoming pushes and notification clicks (deep-link via data.url).
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data && event.data.text() }; }
  const title = typeof payload.title === "string" && payload.title ? payload.title : "نبض+";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    dir: "rtl",
    lang: "ar",
    data: { url: typeof payload.url === "string" ? payload.url : "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  const absolute = new URL(target, self.registration.scope).toString();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (client.url === absolute) return client.focus();
    }
    return self.clients.openWindow(absolute);
  })());
});
