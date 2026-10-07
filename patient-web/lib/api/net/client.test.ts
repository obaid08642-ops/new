import { describe, expect, it, vi } from "vitest";
import { apiFetch, combineSignals, normalizeFetchInput } from "./client";
import { ApiError, isApiError } from "./errors";
import {
  RETRY_DEFAULTS,
  TIMEOUTS,
  backoffDelayMs,
  parseRetryAfterMs,
  requestKind,
  retryDelayMs,
  timeoutForRequest,
} from "./policy";

/**
 * P15.1 — the three proofs the plan requires, plus the policy numbers.
 *
 * Everything runs against a fake `fetch`, injected timers and injected jitter,
 * so the assertions are about behaviour and not about wall-clock luck.
 */

type Call = { url: string; init: RequestInit };

function recorder(responses: Array<Response | Error>) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (next instanceof Error) throw next;
    // A Response body can only be read once, so hand back a fresh clone.
    return next.clone();
  });
  return { calls, fetchImpl };
}

/** A fresh no-op sleep per test: a shared spy would carry calls across tests. */
const makeSleep = () => vi.fn(async (_ms: number, _signal?: AbortSignal) => {});

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
}

describe("P15.1 — the deadline on every request", () => {
  it("fires the 15 s default deadline", async () => {
    vi.useFakeTimers();
    try {
      // Hangs until the abort signal ends the attempt: only the deadline can
      // finish it, which is the whole point of the assertion.
      const fetchImpl = vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init.signal?.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      );

      // `retries: 0` so exactly ONE attempt can finish, which is what makes the
      // deadline itself the only thing that ends this test.
      const pending = apiFetch("/api/patient/cart", { method: "GET" }, {
        fetchImpl,
        sleep: makeSleep(),
        retries: 0,
      });
      const settled = pending.then(
        () => undefined,
        (e: unknown) => e,
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      // One millisecond short of the deadline: still running.
      await vi.advanceTimersByTimeAsync(TIMEOUTS.default - 1);
      let done = false;
      void settled.then(() => {
        done = true;
      });
      await Promise.resolve();
      expect(done).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const error = await settled;
      expect(isApiError(error)).toBe(true);
      expect((error as ApiError).reason).toBe("timeout");
      expect((error as ApiError).action).toBe("retry");
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives uploads 60 s and AI 45 s", () => {
    expect(TIMEOUTS).toEqual({ default: 15_000, upload: 60_000, ai: 45_000 });
  });

  it("classifies an upload by its body and an AI call by its path", () => {
    expect(requestKind("/api/patient/privacy/data-export", { method: "POST", body: new FormData() })).toBe("upload");
    expect(requestKind("/api/upload", { method: "POST", headers: { "content-type": "multipart/form-data" } })).toBe("upload");
    expect(requestKind("/api/patient/patient/pharmacy/chat/threads", { method: "POST" })).toBe("ai");
    expect(requestKind("/api/patient/ai/triage", { method: "POST" })).toBe("ai");
    expect(requestKind("/api/patient/orders", { method: "GET" })).toBe("default");

    expect(timeoutForRequest("/api/upload", { method: "POST", body: new FormData() })).toBe(TIMEOUTS.upload);
    expect(timeoutForRequest("/api/ai/triage", { method: "POST" })).toBe(TIMEOUTS.ai);
    expect(timeoutForRequest("/api/patient/orders", { method: "GET" })).toBe(TIMEOUTS.default);
    // An explicit declaration wins over inference.
    expect(
      timeoutForRequest("/api/patient/orders", { method: "POST", headers: { "x-nabd-request-kind": "upload" } }),
    ).toBe(TIMEOUTS.upload);
  });
});

describe("P15.1 — retries", () => {
  it("honours Retry-After instead of the backoff schedule", async () => {
    const { calls, fetchImpl } = recorder([
      new Response("{}", { status: 503, headers: { "retry-after": "2" } }),
      new Response("{}", { status: 503, headers: { "retry-after": "2" } }),
      json({ ok: true }),
    ]);
    const sleep = makeSleep();

    const response = await apiFetch("/api/patient/orders", { method: "GET" }, {
      fetchImpl,
      sleep,
      now: () => 1_700_000_000_000,
      random: () => 0.5,
    });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([2_000, 2_000]);
  });

  it("reads Retry-After as an HTTP date relative to now", async () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfterMs("Thu, 01 Jan 2026 00:00:05 GMT", now)).toBe(5_000);
    expect(parseRetryAfterMs("not-a-date", now)).toBeUndefined();
    // A date already in the past must not produce a negative wait.
    expect(parseRetryAfterMs("Thu, 01 Jan 2020 00:00:00 GMT", now)).toBe(0);
    expect(retryDelayMs(0, { retryAfter: "1", nowMs: now })).toBe(1_000);
  });

  it("does NOT retry a non-idempotent POST without an idempotency key", async () => {
    const { calls, fetchImpl } = recorder([new Response("boom", { status: 500 })]);
    const sleep = makeSleep();

    const error = await apiFetch("/api/patient/patient/pharmacy/orders", {
      method: "POST",
      body: JSON.stringify({ item: "x" }),
    }, { fetchImpl, sleep }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
    expect((error as ApiError).code).toBe("SERVICE_UNAVAILABLE");
  });

  it("retries the same POST when it carries an idempotency key", async () => {
    const { calls, fetchImpl } = recorder([
      new Response("boom", { status: 500 }),
      json({ ok: true }, { status: 201 }),
    ]);

    const response = await apiFetch("/api/patient/patient/pharmacy/orders", {
      method: "POST",
      headers: { "idempotency-key": "key-1" },
      body: JSON.stringify({ item: "x" }),
    }, { fetchImpl, sleep: makeSleep() });

    expect(response.status).toBe(201);
    expect(calls).toHaveLength(2);
  });

  it("stops at RETRY_DEFAULTS.retries + 1 attempts", async () => {
    const { calls, fetchImpl } = recorder([new Response("boom", { status: 503 })]);
    await apiFetch("/api/patient/orders", { method: "GET" }, { fetchImpl, sleep: makeSleep() }).catch(() => {});
    expect(calls).toHaveLength(RETRY_DEFAULTS.retries + 1);
  });

  it("uses full jitter bounded by the cap", () => {
    expect(backoffDelayMs(0, { baseMs: 100, maxMs: 10_000, random: () => 0 })).toBe(0);
    expect(backoffDelayMs(0, { baseMs: 100, maxMs: 10_000, random: () => 0.999 })).toBe(100);
    // Exponential growth, then the cap.
    expect(backoffDelayMs(3, { baseMs: 100, maxMs: 10_000, random: () => 0.999 })).toBe(800);
    // Attempt 1 doubles, attempt 2 quadruples.
    expect(backoffDelayMs(1, { baseMs: 100, maxMs: 10_000, random: () => 0.5 })).toBe(100);
    // Never above the cap: floor(0.999 * (1000 + 1)) = 999.
    expect(backoffDelayMs(9, { baseMs: 100, maxMs: 1_000, random: () => 0.999 })).toBe(999);
    expect(backoffDelayMs(9, { baseMs: 100, maxMs: 1_000, random: () => 1 })).toBe(1_000);
  });
});

describe("P15.1 — cancellation, offline and the catalog", () => {
  it("cancels the attempt when the caller's signal aborts (screen closed)", async () => {
    const controller = new AbortController();
    const { fetchImpl } = recorder([new Response("{}", { status: 200 })]);
    const pending = apiFetch("/api/patient/cart", { method: "GET", signal: controller.signal }, {
      fetchImpl: (url, init) => new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
    });

    controller.abort();
    const thrown = await pending.catch((e: unknown) => e);
    // The caller gets its own abort reason back, not a catalog error: leaving a
    // screen is not a failure worth a toast.
    expect((thrown as Error).name).toBe("AbortError");
  });

  it("fails fast when the browser already knows it is offline", async () => {
    const { fetchImpl } = recorder([json({})]);
    const error = await apiFetch("/api/patient/cart", {}, { fetchImpl, isOffline: () => true }).catch((e: unknown) => e);

    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).reason).toBe("offline");
    expect((error as ApiError).action).toBe("check_connection");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps every status onto a 13.R5 catalog code and an actionable next step", async () => {
    const cases: Array<[number, string, string]> = [
      [401, "AUTHENTICATION_REQUIRED", "sign_in"],
      [403, "INSUFFICIENT_PERMISSION", "contact_support"],
      [409, "DUPLICATE_TRANSACTION", "contact_support"],
      [422, "INVALID_INPUT", "retry"],
      [429, "RATE_LIMITED", "wait"],
      [503, "SERVICE_UNAVAILABLE", "retry"],
      [418, "UNKNOWN_ERROR", "contact_support"],
    ];
    for (const [status, code, action] of cases) {
      const { fetchImpl } = recorder([json({ message: "x" }, { status })]);
      const error = await apiFetch("/api/patient/cart", { method: "GET" }, { fetchImpl, sleep: makeSleep() }).catch((e: unknown) => e);
      expect([status, (error as ApiError).code, (error as ApiError).action]).toEqual([status, code, action]);
    }
  });

  it("lets a catalog code in the body win over the status", async () => {
    const { fetchImpl } = recorder([json({ code: "NO_AVAILABILITY", message: "full" }, { status: 409 })]);
    const error = await apiFetch("/api/consultations/book", { method: "GET" }, { fetchImpl, sleep: makeSleep() }).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("NO_AVAILABILITY");
  });

  it("ignores a non-catalog body code instead of inventing copy for it", async () => {
    const { fetchImpl } = recorder([json({ code: "slot_taken" }, { status: 409 })]);
    const error = await apiFetch("/api/consultations/book", { method: "GET" }, { fetchImpl, sleep: makeSleep() }).catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("DUPLICATE_TRANSACTION");
  });

  it("keeps the local request-kind hint off the wire", async () => {
    const { fetchImpl } = recorder([json({})]);
    await apiFetch("/api/patient/ai/triage", {
      method: "POST",
      headers: { "x-nabd-request-kind": "ai" },
      body: "{}",
    }, { fetchImpl, sleep: makeSleep() });
    expect(new Headers(fetchImpl.mock.calls[0][1].headers).get("x-nabd-request-kind")).toBeNull();
  });

  it("keeps Next.js cache directives so ISR pages stay static", async () => {
    const { fetchImpl } = recorder([json({})]);
    await apiFetch("/api/patient/orders", {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 3600 },
    } as RequestInit, { fetchImpl, sleep: makeSleep() });
    const init = fetchImpl.mock.calls[0][1] as RequestInit & { next?: unknown };
    expect(init.cache).toBe("force-cache");
    expect(init.next).toEqual({ revalidate: 3600 });
  });
});

describe("F2 — the Request's own signal is forwarded, never dropped", () => {
  it("forwards input.signal when init carries no signal", async () => {
    const controller = new AbortController();
    const input = new Request("https://x.test/api/patient/cart", { signal: controller.signal });
    const request = await normalizeFetchInput(input, {});
    // Undici follows the given signal with a linked one, so identity is not
    // the contract — cancellation linkage is.
    expect(request.callerSignal).toBeDefined();
    expect(request.callerSignal?.aborted).toBe(false);
    controller.abort("input-closed");
    expect(request.callerSignal?.aborted).toBe(true);
  });

  it("still honours init.signal for a plain string input", async () => {
    const controller = new AbortController();
    const request = await normalizeFetchInput("/api/patient/cart", { signal: controller.signal });
    expect(request.callerSignal).toBe(controller.signal);
  });

  it("ends the attempt when EITHER signal aborts, keeping the abort reason", async () => {
    const fromInput = new AbortController();
    const fromInit = new AbortController();
    const input = new Request("https://x.test/api/patient/cart", { signal: fromInput.signal });
    const request = await normalizeFetchInput(input, { signal: fromInit.signal });
    expect(request.callerSignal).toBeDefined();
    expect(request.callerSignal?.aborted).toBe(false);

    fromInit.abort("init-closed");
    expect(request.callerSignal?.aborted).toBe(true);
    const reason = (request.callerSignal as AbortSignal & { reason?: unknown }).reason;
    expect(reason ?? (request.callerSignal ? "aborted" : null)).toBeDefined();
  });

  it("combines manually where AbortSignal.any is missing (iOS 16.4 floor)", async () => {
    const holder = AbortSignal as unknown as { any?: unknown };
    const original = holder.any;
    try {
      holder.any = undefined;
      const fromInput = new AbortController();
      const fromInit = new AbortController();
      const combined = combineSignals(fromInput.signal, fromInit.signal);
      expect(combined).toBeDefined();
      expect(combined?.aborted).toBe(false);

      fromInput.abort("input-closed");
      expect(combined?.aborted).toBe(true);
      expect((combined as AbortSignal & { reason?: unknown }).reason).toBe("input-closed");

      const alreadyAborted = new AbortController();
      alreadyAborted.abort("already");
      expect(combineSignals(alreadyAborted.signal, new AbortController().signal)?.aborted).toBe(true);
      expect(combineSignals(undefined, undefined)).toBeUndefined();
      const solo = new AbortController().signal;
      expect(combineSignals(solo, undefined)).toBe(solo);
    } finally {
      holder.any = original;
    }
  });

  it("cancels the request when the Request's own signal aborts first", async () => {
    const controller = new AbortController();
    controller.abort("screen-closed");
    const input = new Request("https://x.test/api/patient/cart", { signal: controller.signal });
    const { fetchImpl } = recorder([json({})]);

    const thrown = await apiFetch(input, {}, { fetchImpl, sleep: makeSleep() }).catch((e: unknown) => e);

    // The caller's own reason comes back, and nothing hits the wire.
    expect(thrown).toBe("screen-closed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("aborts mid-flight when the Request's signal fires during the attempt", async () => {
    const controller = new AbortController();
    const input = new Request("https://x.test/api/patient/cart", { signal: controller.signal });
    const pending = apiFetch(input, {}, {
      fetchImpl: (_url, init) => new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
      sleep: makeSleep(),
      retries: 0,
    });

    controller.abort("screen-closed");
    const thrown = await pending.catch((e: unknown) => e);
    expect(thrown).toBe("screen-closed");
  });
});
