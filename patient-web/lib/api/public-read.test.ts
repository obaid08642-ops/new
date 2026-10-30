import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicEntity } from "./public-read";

describe("readPublicEntity (A-14)", () => {
  const original = globalThis.fetch;
  const mock = () => globalThis.fetch as ReturnType<typeof vi.fn>;
  beforeEach(() => { globalThis.fetch = vi.fn(); });
  afterEach(() => { globalThis.fetch = original; vi.restoreAllMocks(); });

  it("keeps a found answer in the cache for the revalidate time and reads it once", async () => {
    mock().mockResolvedValue(new Response(JSON.stringify({ content: "x" }), { status: 200 }));
    expect(await readPublicEntity("https://api.test/p", 3600)).toEqual({ content: "x" });
    expect(mock()).toHaveBeenCalledTimes(1);
    expect(mock().mock.calls[0][1].next).toEqual({ revalidate: 3600 });
    expect(mock().mock.calls[0][1].cache).toBeUndefined();
  });

  it("re-reads an empty 200 with no-store, so the cached empty answer is not the one returned", async () => {
    mock().mockResolvedValueOnce(new Response("", { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ content: "new" }), { status: 200 }));
    expect(await readPublicEntity("https://api.test/p", 3600)).toEqual({ content: "new" });
    expect(mock().mock.calls[1][1].cache).toBe("no-store");
    expect(mock().mock.calls[1][1].next).toBeUndefined();
  });

  it("returns null when it is still empty, and the next call reads again (nothing kept)", async () => {
    mock().mockImplementation(async () => new Response("", { status: 200 }));
    expect(await readPublicEntity("https://api.test/p", 3600)).toBeNull();
    expect(await readPublicEntity("https://api.test/p", 3600)).toBeNull();
    expect(mock().mock.calls.filter(([, init]) => init.cache === "no-store")).toHaveLength(2);
  });

  it("throws on a 5xx so the last good copy is kept", async () => {
    mock().mockResolvedValue(new Response("", { status: 503 }));
    await expect(readPublicEntity("https://api.test/p", 3600)).rejects.toThrow();
  });
});
