import { describe, expect, it } from "vitest";

const describeSandbox = process.env.RUN_SANDBOX_TESTS === "true" ? describe : describe.skip;

describeSandbox("Sandbox medicines catalog contract", () => {
  it("supports bounded list, search, and detail reads without logging medicine records", async () => {
    const baseUrl = process.env.NABD_API_BASE_URL;
    expect(baseUrl).toBeTruthy();
    const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });
    expect(response.status).toBe(200);
    const payload: unknown = await response.json();
    expect(payload === null || typeof payload === "object").toBe(true);
    const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
    const items = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.items) ? root.items : Array.isArray(root?.results) ? root.results : [];
    const first = items[0] && typeof items[0] === "object" ? items[0] as Record<string, unknown> : null;
    const id = typeof first?.id === "string" ? first.id : undefined;
    const searchTerm = typeof first?.name_ar === "string" && first.name_ar.trim() ? first.name_ar : typeof first?.name_en === "string" && first.name_en.trim() ? first.name_en : undefined;
    if (!id) return;

    const detail = await fetch(`${baseUrl}/medicines/${encodeURIComponent(id)}/details`, { signal: AbortSignal.timeout(12_000) });
    expect(detail.status).toBe(200);
    if (!searchTerm) return;

    const search = await fetch(`${baseUrl}/medicines?limit=1&page=1&q=${encodeURIComponent(searchTerm)}`, { signal: AbortSignal.timeout(12_000) });
    expect(search.status).toBe(200);
  }, 40_000);
});
