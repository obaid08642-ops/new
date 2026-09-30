"use client";

import { useEffect } from "react";

/**
 * N9: Register the web push service worker.
 *
 * The VAPID backend (/api/push/web/subscribe) already exists. This component
 * registers the service worker and subscribes the user to push notifications.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      // Request notification permission and subscribe
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send the subscription to the backend
      await fetch("/api/push/web/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      }).catch(() => null);
    }).catch(() => null);
  }, []);

  return null;
}
