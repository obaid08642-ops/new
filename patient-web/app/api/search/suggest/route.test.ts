import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.fn();
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...args: unknown[]) => callPatientApi(...args) }));

import { GET } from "./route";

const PUBLIC = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const body = { suggestions: [{ id: "m1", type: "medicine", name: "Banadol", highlights: [{ start: 0, length: 3 }], slug: "banadol", code: null }] };
const upstreamAnswer = (status: number, cacheControl: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...(cacheControl ? { "cache-control": cacheControl } : {}) } });
const call = (query: string) => GET(new NextRequest(`https://nabd.test/api/search/suggest?${query}`));

describe("GET /api/search/suggest: edge cache", () => {
  beforeEach(() => callPatientApi.mockReset());

  it("forwards the API's public Cache-Control for a 200, so the website's edge can cache q and locale", async () => {
    callPatientApi.mockResolvedValue(upstreamAnswer(200, PUBLIC));
    const response = await call("q=ban&locale=en");
    expect(callPatientApi).toHaveBeenCalledWith("/search/suggest?q=ban&locale=en", expect.anything());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PUBLIC);
    expect(await response.json()).toEqual(body);
  });

  it("keeps no-store for a private answer, a missing header, and any answer that is not a 200", async () => {
    callPatientApi.mockResolvedValueOnce(upstreamAnswer(200, "private, no-store"));
    expect((await call("q=ban&locale=en")).headers.get("cache-control")).toBe("no-store");
    callPatientApi.mockResolvedValueOnce(upstreamAnswer(200, null));
    expect((await call("q=ban&locale=en")).headers.get("cache-control")).toBe("no-store");
    callPatientApi.mockResolvedValueOnce(upstreamAnswer(503, PUBLIC));
    expect((await call("q=ban&locale=en")).headers.get("cache-control")).toBe("no-store");
  });

  it("the kill-switch answer (disabled) is forwarded like any 200; the purge on a switch change is what keeps it fresh", async () => {
    callPatientApi.mockResolvedValue(new Response(JSON.stringify({ suggestions: [], disabled: true }), { status: 200, headers: { "cache-control": PUBLIC } }));
    const response = await call("q=ban&locale=en");
    expect(response.headers.get("cache-control")).toBe(PUBLIC);
    expect(await response.json()).toEqual({ suggestions: [], disabled: true });
  });

  it("answers a missing query without asking the API", async () => {
    const response = await call("q=&locale=en");
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(callPatientApi).not.toHaveBeenCalled();
  });
});
