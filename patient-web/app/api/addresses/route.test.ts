import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { GET, POST } from "./route";

function request(body: unknown, key = "idempotency-address-test-123456") { return new Request("https://web.test/api/addresses", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) }); }

describe("addresses BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined);
  });
  it("rejects incomplete coordinates before contacting upstream", async () => {
    expect((await POST(request({ street: "شارع", lat: 24 }))).status).toBe(400);
    expect((await POST(request({ street: "شارع", lat: 24, lng: 46 }, "short"))).status).toBe(400);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("returns only an array for saved-address reads", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify([{ id: "address-1", street: "شارع", lat: 24, lng: 46 }]), { status: 200 }));
    const response = await GET();
    expect(response.status).toBe(200); expect(await response.json()).toEqual([{ id: "address-1", street: "شارع", lat: 24, lng: 46 }]);
    expect(state.callPatientApi).toHaveBeenCalledWith("/users/me/addresses", expect.any(Object), "server-access");
  });
  it("forwards a verified address with the session held on the server", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "address-1", street: "شارع", lat: 24, lng: 46 }), { status: 201 }));
    const response = await POST(request({ label: "المنزل", street: "شارع", lat: 24, lng: 46 }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ id: "address-1", street: "شارع", lat: 24, lng: 46 });
    expect(state.callPatientApi).toHaveBeenCalledWith("/users/me/addresses", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "idempotency-key": "idempotency-address-test-123456", "x-device-id": "device-1" }), body: JSON.stringify({ label: "المنزل", street: "شارع", lat: 24, lng: 46 }) }), "server-access");
  });
});
