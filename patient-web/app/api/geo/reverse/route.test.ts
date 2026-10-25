import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ token: "t" as string | undefined, call: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (hoisted.token ? { value: hoisted.token } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: hoisted.call }));

import { GET } from "./route";

const get = (qs: string) => GET(new Request(`http://localhost/api/geo/reverse${qs}`));

beforeEach(() => { hoisted.token = "t"; hoisted.call.mockReset(); });

describe("GET /api/geo/reverse", () => {
  it("passes the point to the backend with the patient's token and answers no-store", async () => {
    hoisted.call.mockResolvedValue(new Response(JSON.stringify({ city_id: "riyadh" }), { status: 200 }));
    const res = await get("?lat=24.7136&lng=46.6753");
    expect(hoisted.call.mock.calls[0][0]).toBe("/geo/reverse?lat=24.7136&lng=46.6753");
    expect(hoisted.call.mock.calls[0][2]).toBe("t");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ city_id: "riyadh" });
  });

  it("refuses a missing, empty or out-of-range point without calling the backend", async () => {
    for (const qs of ["", "?lat=24", "?lat=&lng=", "?lat=abc&lng=1", "?lat=91&lng=1", "?lat=1&lng=181"]) expect((await get(qs)).status).toBe(400);
    expect(hoisted.call).not.toHaveBeenCalled();
  });

  it("is for signed-in patients: 401 without the cookie", async () => {
    hoisted.token = undefined;
    expect((await get("?lat=24&lng=46")).status).toBe(401);
    expect(hoisted.call).not.toHaveBeenCalled();
  });

  it("keeps the backend's status and its short error code (outside_service_area, address_not_found, geo_unavailable)", async () => {
    hoisted.call.mockResolvedValue(new Response(JSON.stringify({ message: "outside_service_area", stack: "secret" }), { status: 400 }));
    const res = await get("?lat=10&lng=10");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "outside_service_area" });
  });
});
