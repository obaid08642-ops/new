import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLastGood, publicListRead } from "./last-good";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("publicListRead", () => {
  afterEach(() => { clearLastGood(); vi.useRealTimers(); });

  it("returns a good answer as is", async () => {
    const res = await publicListRead("a", async () => ok({ data: [1] }));
    expect(await res?.json()).toEqual({ data: [1] });
  });

  it("serves the last good copy when the backend then fails (5xx, 429, no answer)", async () => {
    await publicListRead("a", async () => ok({ data: [1] }));
    for (const failing of [() => new Response(null, { status: 503 }), () => new Response(null, { status: 429 }), () => null]) {
      const res = await publicListRead("a", async () => failing(), { retry: false });
      expect(res?.status).toBe(200);
      expect(res?.headers.get("x-served-stale")).toBe("1");
      expect(await res?.json()).toEqual({ data: [1] });
    }
  });

  it("shows the error (no copy) when nothing good was ever read", async () => {
    const res = await publicListRead("never", async () => new Response(null, { status: 503 }), { retry: false });
    expect(res?.status).toBe(503);
    expect(await publicListRead("never", async () => null, { retry: false })).toBeNull();
  });

  it("tries once more before using the copy", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(ok({ data: [2] }));
    const pending = publicListRead("b", read);
    await vi.advanceTimersByTimeAsync(500);
    const res = await pending;
    expect(read).toHaveBeenCalledTimes(2);
    expect(await res?.json()).toEqual({ data: [2] });
  });

  it("passes a real 4xx on, even with a copy", async () => {
    await publicListRead("c", async () => ok({ data: [3] }));
    const res = await publicListRead("c", async () => new Response(null, { status: 404 }), { retry: false });
    expect(res?.status).toBe(404);
  });
});
