import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ slots: vi.fn() }));
vi.mock("@/lib/api/doctors-server", () => ({ getPublicDoctorSlots: server.slots }));
vi.mock("next/headers", () => ({ cookies: vi.fn(() => { throw new Error("the public slots route must not read a cookie"); }) }));

import { GET } from "./route";

const call = (query: string, doctorId = "dr-1") => GET(new Request(`https://nabd.plus/api/consultations/doctors/${doctorId}/slots?${query}`), { params: Promise.resolve({ doctorId }) });
const slot = { start: "2026-09-01T09:00:00.000Z", end: "2026-09-01T09:30:00.000Z", label: "09:00", available: true };

describe("consultation slots BFF (public)", () => {
  beforeEach(() => server.slots.mockReset());

  it("rejects an invalid date", async () => {
    expect((await call("date=bad&service_type=clinic")).status).toBe(400);
    expect(server.slots).not.toHaveBeenCalled();
  });

  it("serves a signed-out visitor: no session needed, free slots only, cached briefly", async () => {
    server.slots.mockResolvedValue(new Response(JSON.stringify({ slots: [{ ...slot, patient_id: "secret" }], date: "2026-09-01" }), { status: 200 }));
    const res = await call("date=2026-09-01&service_type=video");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slots: [slot] });                     // nothing but start, end, label, available
    expect(res.headers.get("cache-control")).toContain("s-maxage=20");
    expect(server.slots).toHaveBeenCalledWith({ id: "dr-1", date: "2026-09-01", serviceType: "video" });
  });

  it("passes an upstream error status through and never caches it", async () => {
    server.slots.mockResolvedValue(new Response("{}", { status: 404 }));
    const res = await call("date=2026-09-01&service_type=clinic");
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control") ?? "").not.toContain("s-maxage");
  });

  it("answers 502 when the backend cannot be reached", async () => {
    server.slots.mockResolvedValue(null);
    expect((await call("date=2026-09-01&service_type=clinic")).status).toBe(502);
  });
});
