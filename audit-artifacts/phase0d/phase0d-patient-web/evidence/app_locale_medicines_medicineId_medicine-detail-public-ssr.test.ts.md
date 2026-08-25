# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicines/[medicineId]/medicine-detail-public-ssr.test.ts`
- **Member SHA-256:** `e54b757d1846f5d74fe9a1ba8754ed6abd2bbf05173a5967b9714f694da4c413`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import PublicMedicineDetailPage, { generateMetadata } from "./page";`
- `35: const html = renderToStaticMarkup(await PublicMedicineDetailPage({ params }));`
- `39: expect(html).toContain('"@type":"MedicalWebPage"');`
- `40: expect(html).toContain('href="/en/medicine-catalog"');`
### backend_consumers_or_contracts
- `11: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPublicMedicine: vi.fn() }));`
- `11: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));`
- `18: beforeEach(() => state.getPublicMedicine.mockReset());`
- `21: state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({`
- `33: }), { status: 200 }));`
- `37: expect(state.getPublicMedicine).toHaveBeenCalledWith("published-medicine");`
- `47: state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({ data: { id: "published-medicine", name_en: "Published medicine" } }), { status: 200 }));`
### payment_insurance_relevance
- `29: price: 99,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
