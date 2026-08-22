import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicHomeCareService, getPublicHomeCareServices } from "./home-care-services-server";

describe("home-care public service wrappers", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });
  it("does not send Authorization for list", async () => { await getPublicHomeCareServices(); const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]; expect(options.headers).toEqual({ Accept: "application/json" }); });
  it("allows only a safe detail identifier", async () => { await getPublicHomeCareService("svc-1"); expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/home-care/services/svc-1"), expect.any(Object)); await expect(getPublicHomeCareService("patient@example.com")).rejects.toThrow("invalid_home_care_service_id"); });
});
