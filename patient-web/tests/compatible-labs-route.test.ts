import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...a: unknown[]) => api(...a) }));

import { GET } from "@/app/api/diagnostics/compatible-labs/route";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("GET /api/diagnostics/compatible-labs (#633)", () => {
  beforeEach(() => api.mockReset());

  it("asks the radiology module for scans", async () => {
    api.mockResolvedValue(json([{ id: "rad-1", name: "Scan centre" }]));
    const res = await GET(new Request("http://x/api/diagnostics/compatible-labs?testIds=rad_mri"));
    expect(api).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0][0]).toBe("/radiology/compatible-providers?serviceIds=mri");
    expect(await res.json()).toEqual([{ id: "rad-1", name: "Scan centre" }]);
  });

  it("keeps only the providers that run every line of a mixed cart", async () => {
    api.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0]);
      return path.startsWith("/labs/") ? json([{ id: "h-1" }, { id: "lab-2" }]) : json({ data: [{ id: "h-1" }, { id: "rad-3" }] });
    });
    const res = await GET(new Request("http://x/api/diagnostics/compatible-labs?testIds=cbc,rad_xray"));
    expect(api.mock.calls.map((c) => c[0])).toEqual(["/labs/compatible-providers?testIds=cbc", "/radiology/compatible-providers?serviceIds=xray"]);
    expect(await res.json()).toEqual([{ id: "h-1" }]);
  });
});
