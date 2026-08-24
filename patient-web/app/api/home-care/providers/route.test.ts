import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { GET } from "./route";

describe("home-care providers BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires a session", async () => { state.cookieStore.get.mockReturnValue(undefined); expect((await GET()).status).toBe(401); });
  it("returns only bounded provider selection fields", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify([{ id: "nurse-1", full_name: "ممرض موثوق", specialties: ["wound"], rating_avg: 4.8, years_experience: 6, address: { lat: 1, lng: 2 }, license: "private" }]), { status: 200 }));
    const response = await GET();
    expect(await response.json()).toEqual({ providers: [{ id: "nurse-1", name: "ممرض موثوق", specialties: ["wound"], rating: 4.8, experience_years: 6 }] });
  });
});
