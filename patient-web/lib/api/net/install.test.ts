import { describe, expect, it, vi } from "vitest";
import { installNetworkPolicy, resetNetworkPolicyInstallForTests } from "./install";
import { isApiError } from "./errors";

type FetchSpy = ReturnType<typeof vi.fn<(url: string, init: RequestInit) => Promise<Response>>>;

/**
 * P15.1 — the consolidation itself.
 *
 * patient-web's browser side has no shared API helper: components call the
 * global `fetch` directly. This asserts that installing the policy once makes
 * such a call obey the deadline/retry/offline rules, and — just as important —
 * that an untouched call site still sees exactly the response it always did.
 */

function makeTarget() {
  return {
    fetch: vi.fn(async (_url: string, _init: RequestInit) => new Response('{"ok":true}', { status: 200 })) as FetchSpy,
  };
}

describe("P15.1 — the global install reaches every call site", () => {
  it("applies the offline pre-check to a plain global-style call", async () => {
    resetNetworkPolicyInstallForTests();
    const target = makeTarget();
    const original = target.fetch;
    let online = true;
    expect(installNetworkPolicy({ target: target as never, isOffline: () => !online })).toBe(true);

    const response = await target.fetch("/api/patient/cart", { method: "GET" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    online = false;
    const error = await target.fetch("/api/patient/cart", { method: "GET" }).catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    // Nothing hit the wire while offline.
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("installs only once, so a second mount cannot stack policies", () => {
    resetNetworkPolicyInstallForTests();
    const first = makeTarget();
    const second = makeTarget();
    expect(installNetworkPolicy({ target: first as never })).toBe(true);
    expect(installNetworkPolicy({ target: second as never })).toBe(false);
  });

  it("retries a safe global-style call and does not retry a bare POST", async () => {
    resetNetworkPolicyInstallForTests();
    const responses = [new Response("boom", { status: 503 }), new Response("boom", { status: 503 }), new Response("{}", { status: 200 })];
    let index = 0;
    const target = {
      fetch: vi.fn(async (_url: string, _init: RequestInit) => {
        const next = responses[Math.min(index, responses.length - 1)];
        index += 1;
        return next.clone();
      }) as FetchSpy,
    };
    installNetworkPolicy({ target: target as never });

    // Retries here are real setTimeout waits, so allow for the backoff budget.
    const ok = await target.fetch("/api/patient/orders", { method: "GET" });
    expect(ok.status).toBe(200);
    expect(index).toBe(3);

    index = 0;
    const error = await target
      .fetch("/api/patient/patient/pharmacy/orders", { method: "POST", body: "{}" })
      .catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    expect(index).toBe(1);
  });
});
