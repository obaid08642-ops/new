import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicMedicines } from "@/lib/api/public-medicines-server";

describe("public medicine list", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the cacheable /public/medicines route, anonymously, with the same query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await getPublicMedicines({ q: "panadol", page: 2, category: "x", sort: "trending" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/public/medicines?limit=24&page=2&q=panadol&category=x&sort=trending");
    expect(init.headers).toEqual({ Accept: "application/json" });
  });
});
