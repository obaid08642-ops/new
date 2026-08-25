# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts`
- **Member SHA-256:** `37ec3295d9bdd0f01e774299054d2e8d24eeccff63c006cea348f184fa2d07f6`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import PublicMedicineCatalogPage, { generateMetadata } from "./page";`
- `18: const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ page: "1" }) }));`
- `20: expect(state.getPublicMedicines).toHaveBeenCalledWith({ page: 1 });`
- `22: expect(html).toContain('\"@type\":\"WebPage\"');`
- `30: const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }));`
- `38: const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "query", page: "1" }) });`
### backend_consumers_or_contracts
- `8: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicines: state.getPublicMedicines }));`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPublicMedicines: vi.fn() }));`
- `8: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicines: state.getPublicMedicines }));`
- `13: beforeEach(() => state.getPublicMedicines.mockReset());`
- `16: state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }]), { status: 200 }));`
- `20: expect(state.getPublicMedicines).toHaveBeenCalledWith({ page: 1 });`
- `28: state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "باراسيتامول 500 مجم" }]), { status: 200 }));`
### payment_insurance_relevance
- `15: it("renders only public catalogue fields and omits price and patient data", async () => {`
- `16: state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }]), { status: 200 }));`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
