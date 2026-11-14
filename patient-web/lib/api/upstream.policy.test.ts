import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callPatientApi } from "./upstream";

const ok = () => new Response("{}", { status: 200 });
const refused = (status: number, retryAfter?: string) => new Response(null, { status, headers: retryAfter ? { "retry-after": retryAfter } : {} });
/** A backend that never answers; the call ends with an AbortError when its signal fires. */
const hang = (_url: unknown, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
  init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
});

describe("callPatientApi timeout, retries and cancellation (15.1)", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("a backend that does not answer in time gives 504 upstream_timeout; a write without a key is not replayed", async () => {
    const fetchMock = vi.fn(hang);
    vi.stubGlobal("fetch", fetchMock);
    const response = await callPatientApi("/cart/checkout", { method: "POST", body: "{}", timeoutMs: 30 }, "t");
    expect(response.status).toBe(504);
    expect(response.statusText).toBe("upstream_timeout");
    expect(response.headers.get("retry-after")).toBe("2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a read that times out is tried once more, then gives 504", async () => {
    const fetchMock = vi.fn(hang);
    vi.stubGlobal("fetch", fetchMock);
    const response = await callPatientApi("/orders/mine", { timeoutMs: 30 }, "t");
    expect(response.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("with a clock we control", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

    it("a retry honours Retry-After (not at 999 ms, at 1000 ms)", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(refused(429, "1")).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", fetchMock);
      const result = callPatientApi("/medicines/search?q=a", {}, "t");
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2);
      expect((await result).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("a Retry-After longer than 5 s is not waited for: the refusal is returned", async () => {
      const fetchMock = vi.fn().mockResolvedValue(refused(429, "60"));
      vi.stubGlobal("fetch", fetchMock);
      expect((await callPatientApi("/medicines/search?q=a", {}, "t")).status).toBe(429);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("no retry for a non-idempotent POST without a key on 503; with the browser's key it is tried again with the same key", async () => {
      const no = vi.fn().mockResolvedValue(refused(503));
      vi.stubGlobal("fetch", no);
      expect((await callPatientApi("/cart/checkout", { method: "POST", body: "{}" }, "t")).status).toBe(503);
      expect(no).toHaveBeenCalledTimes(1);

      const yes = vi.fn().mockResolvedValueOnce(refused(503)).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", yes);
      const result = callPatientApi("/cart/checkout", { method: "POST", body: "{}", headers: { "idempotency-key": "checkout-attempt-0001" } }, "t");
      await vi.advanceTimersByTimeAsync(2000);
      expect((await result).status).toBe(200);
      const keys = yes.mock.calls.map(([, init]) => new Headers(init.headers).get("idempotency-key"));
      expect(keys).toEqual(["checkout-attempt-0001", "checkout-attempt-0001"]);
    });

    it("429 is tried again for a write without a key", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(refused(429, "1")).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", fetchMock);
      const result = callPatientApi("/cart/checkout", { method: "POST", body: "{}" }, "t");
      await vi.advanceTimersByTimeAsync(1500);
      expect((await result).status).toBe(200);
    });

    it("a browser that goes away stops the call and its wait: no further try", async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockResolvedValue(refused(503, "3"));
      vi.stubGlobal("fetch", fetchMock);
      const result = callPatientApi("/orders/mine", { signal: controller.signal }, "t");
      await vi.advanceTimersByTimeAsync(500);
      controller.abort();
      const response = await result;
      expect(response.status).toBe(503);
      expect(response.statusText).toBe("request_aborted");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
