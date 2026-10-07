import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { installNetworkPolicy, resetNetworkPolicyInstallForTests } from "./install";
import { isApiError } from "./errors";
import { resolveErrorCopy, translatorsFromMessages } from "./catalog";

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

  it("keeps the connection-error path working when the network throws a TypeError", async () => {
    // F3 — the wrapper changes the error TYPE every existing call site sees:
    // a dead connection used to reject with a bare `TypeError("fetch failed")`
    // and now rejects with a catalog-mapped `ApiError`. No shipped `catch`
    // branches on `TypeError` (verified by grep — see P15_NOTES.md), and the
    // one seam that must hold is pinned here: the mapped error still reads as
    // a connection problem with a next step, not UNKNOWN_ERROR.
    resetNetworkPolicyInstallForTests();
    const target = {
      fetch: vi.fn(async (_url: string, _init: RequestInit): Promise<Response> => {
        throw new TypeError("fetch failed");
      }) as FetchSpy,
    };
    installNetworkPolicy({ target: target as never });

    const error = await target.fetch("/api/patient/cart", { method: "GET" }).catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    if (!isApiError(error)) throw new Error("expected the wrapper to map the TypeError onto an ApiError");
    expect(error.reason).toBe("network");
    expect(error.action).toBe("check_connection");
    expect(error.code).toBe("SERVICE_UNAVAILABLE");

    const messages = JSON.parse(readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8")) as Record<
      string,
      unknown
    >;
    const { errors, network } = translatorsFromMessages(messages);
    const copy = resolveErrorCopy(errors, network, error);
    expect(copy.code).toBe("SERVICE_UNAVAILABLE");
    expect(copy.reason).toBe("network");
    expect(copy.message).toBe(network("offline"));
    expect(copy.nextStep).toBe(network("nextStep.check_connection"));
  });
});
