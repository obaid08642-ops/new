import { beforeEach, describe, expect, it, vi } from "vitest";

const call = vi.fn();
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...args: unknown[]) => call(...args) }));
vi.mock("@/lib/auth/guest-merge", () => ({ guestMergeHeaders: async (h: Record<string, string>) => h }));
import { POST } from "./route";

const req = () => new Request("http://x/api/auth/login", { method: "POST", body: JSON.stringify({ identifier: "a@b.co", password: "x" }) });
const upstream = (role: string) => new Response(JSON.stringify({ user: { role }, token: { accessToken: "a.b.c", refreshToken: "r" } }), { status: 200 });

describe("POST /api/auth/login role check", () => {
  beforeEach(() => call.mockReset());
  it("refuses a doctor and sets no session cookie", async () => {
    call.mockResolvedValue(upstream("doctor"));
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "wrong_app" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("signs a patient in", async () => {
    call.mockResolvedValue(upstream("patient"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("nabd_access=");
  });
});
