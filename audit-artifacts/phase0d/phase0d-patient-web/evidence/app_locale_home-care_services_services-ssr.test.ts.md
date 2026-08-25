# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/services/services-ssr.test.ts`
- **Member SHA-256:** `a282039caa459d895ffbda4cc87ee86807b1acb931f6c1a1dc6ed1e531433889`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import HomeCareServicesPage from "./page";`
- `9: import HomeCareServicePage from "./[serviceId]/page";`
- `12: it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarku`
- `13: it("renders detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing", description_en: "Verified description", patient_id: "p`
### backend_consumers_or_contracts
- `7: vi.mock("@/lib/api/home-care-services-server", () => ({ getPublicHomeCareServices: state.list, getPublicHomeCareService: state.detail }));`
- `13: it("renders detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing", description_en: "Verified description", patient_id: "p`
### auth_ownership
- `12: it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarku`
### state_transitions
- `3: const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));`
- `7: vi.mock("@/lib/api/home-care-services-server", () => ({ getPublicHomeCareServices: state.list, getPublicHomeCareService: state.detail }));`
- `11: beforeEach(() => { state.list.mockReset(); state.detail.mockReset(); });`
- `12: it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarku`
- `13: it("renders detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing", description_en: "Verified description", patient_id: "p`
### payment_insurance_relevance
- `12: it("renders public list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarku`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
