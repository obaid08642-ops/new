import { afterEach, describe, expect, it, vi } from "vitest";
import { disableWebPush, enableWebPush } from "./web-push";

/** batch-0-web#9: turning push on subscribes this browser through the patient proxy; off removes it. Boundaries only. */
const subscription = { endpoint: "https://push.example.test/abc", toJSON: () => ({ endpoint: "https://push.example.test/abc", keys: { p256dh: "p", auth: "a" } }), unsubscribe: vi.fn(async () => true) };

/** A VAPID public key has this shape (an uncompressed P-256 point, base64url): 0x04 then 64 bytes. Public, not a secret. */
const SAMPLE_PUBLIC_KEY = Buffer.from([4, ...Array.from({ length: 64 }, (_, i) => i + 1)]).toString("base64url");

function browser({ permission = "granted", key = SAMPLE_PUBLIC_KEY } = {}) {
  const registration = { pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn(async () => subscription) } };
  vi.stubGlobal("window", { PushManager: function PushManager() {}, Notification: {} });
  vi.stubGlobal("Notification", { permission, requestPermission: vi.fn(async () => permission) });
  vi.stubGlobal("navigator", { userAgent: "test", serviceWorker: { register: vi.fn(async () => registration), getRegistration: vi.fn(async () => ({ pushManager: { getSubscription: async () => subscription } })) } });
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => (url.endsWith("/vapid-key") ? new Response(JSON.stringify({ ok: true, public_key: key })) : new Response(JSON.stringify({ ok: true }))));
  vi.stubGlobal("fetch", fetchMock);
  return { registration, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

describe("web push in this browser", () => {
  it("subscribes with the server's key and saves the subscription through the patient proxy", async () => {
    const { registration, fetchMock } = browser();
    expect(await enableWebPush()).toBe("subscribed");
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    const save = fetchMock.mock.calls.find(([url]) => url === "/api/patient/push/web/subscribe");
    expect(JSON.parse(String((save?.[1] as RequestInit).body))).toMatchObject({ endpoint: subscription.endpoint, keys: { p256dh: "p", auth: "a" } });
  });

  it("says so when the patient refuses, or when the server has no key (nothing is subscribed)", async () => {
    let env = browser({ permission: "denied" });
    expect(await enableWebPush()).toBe("denied");
    expect(env.registration.pushManager.subscribe).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    env = browser({ key: "" });
    expect(await enableWebPush()).toBe("unavailable");
    expect(env.registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("turning push off removes this browser on the server and in the browser", async () => {
    const { fetchMock } = browser();
    await disableWebPush();
    expect(fetchMock).toHaveBeenCalledWith("/api/patient/push/web/unsubscribe", expect.objectContaining({ method: "POST" }));
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});
