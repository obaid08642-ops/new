import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getPublicSpecialties } from "./specialties-server";

describe("public specialties server wrapper", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); });
  afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it("calls the public contract without a patient token", async () => {
    await getPublicSpecialties();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/care/specialties"), expect.objectContaining({ headers: { Accept: "application/json" }, cache: "no-store" }));
    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers).not.toHaveProperty("Authorization");
  });
});
