/**
 * batch-0-web#9: web push in this browser. The service worker (public/sw.js) shows the pushes; the subscription goes to
 * the backend through the patient proxy (POST /push/web/subscribe, GET /push/web/vapid-key). Called when the patient turns
 * push on (Settings > Notifications, onboarding); never prompts on its own.
 */
export type WebPushResult = "subscribed" | "denied" | "unsupported" | "unavailable";

function keyBytes(base64Url: string): Uint8Array {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enableWebPush(): Promise<WebPushResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return "denied";
  const keyResponse = await fetch("/api/patient/push/web/vapid-key", { cache: "no-store" }).catch(() => null);
  const key = keyResponse?.ok ? ((await keyResponse.json().catch(() => null)) as { public_key?: string | null } | null)?.public_key : null;
  if (!key) return "unavailable";
  const registration = await navigator.serviceWorker.register("/sw.js");
  const subscription = (await registration.pushManager.getSubscription())
    ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource }));
  const json = subscription.toJSON();
  const saved = await fetch("/api/patient/push/web/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth }, user_agent: navigator.userAgent.slice(0, 300) }),
  }).catch(() => null);
  return saved?.ok ? "subscribed" : "unavailable";
}

/** Stops pushes to this browser (the patient turned push off). */
export async function disableWebPush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js").catch(() => undefined);
  const subscription = await registration?.pushManager.getSubscription().catch(() => null);
  if (!subscription) return;
  await fetch("/api/patient/push/web/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => null);
  await subscription.unsubscribe().catch(() => false);
}
