# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/labs/labs-ssr.test.ts`
- **Member SHA-256:** `ed81c3752ab452d5f1e5e25ef09808da46d2d86a3fe080f9145c6eb1a52b1430`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import LabsServicesPage from "./page";`
- `22: const result = await LabsServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });`
- `28: const result = await LabsServicesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices }));`
### auth_ownership
- `11: function containsRole(value: unknown, role: string): boolean {`
- `13: const node = value as { props?: { role?: string; children?: unknown } };`
- `14: if (node.props?.role === role) return true;`
- `16: return Array.isArray(children) ? children.some((child) => containsRole(child, role)) : containsRole(children, role);`
- `29: expect(containsRole(result, "alert")).toBe(true);`
### state_transitions
- `3: const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn() }));`
- `4: vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices }));`
- `21: state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "cbc", name_en: "CBC", price: 20 }]), { status: 200 }));`
- `24: expect(state.getPublicLabServices).toHaveBeenCalledWith({ search: "", homeOnly: false });`
- `26: it("renders an alert state when the live endpoint fails", async () => {`
- `27: state.getPublicLabServices.mockResolvedValue(new Response("", { status: 503 }));`
### payment_insurance_relevance
- `21: state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "cbc", name_en: "CBC", price: 20 }]), { status: 200 }));`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
