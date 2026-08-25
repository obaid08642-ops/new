# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/specialties/specialties-ssr.test.ts`
- **Member SHA-256:** `277e407ee4af45c60e7b74f8f1151f1e7f0de6530c2fe9e85cdcd0fe15d43548`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import SpecialtySelectPage from "./page";`
- `17: const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "en" }) }));`
- `26: const html = renderToStaticMarkup(await SpecialtySelectPage({ params: Promise.resolve({ locale: "ar" }) }));`
### backend_consumers_or_contracts
- `8: vi.mock("@/lib/api/specialties-server", () => ({ getPublicSpecialties: state.getPublicSpecialties }));`
- `19: expect(html).toContain("/en/appointments?specialty=%D9%82%D9%84%D8%A8");`
### auth_ownership
- `15: it("renders only parsed public display fields without a private session token", async () => {`
- `21: expect(html).not.toContain("access-token");`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPublicSpecialties: vi.fn() }));`
- `8: vi.mock("@/lib/api/specialties-server", () => ({ getPublicSpecialties: state.getPublicSpecialties }));`
- `13: beforeEach(() => state.getPublicSpecialties.mockReset());`
- `16: state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7, patient_id: "private-patient" }] }), { status: 200 }));`
- `25: state.getPublicSpecialties.mockResolvedValue(null);`
### payment_insurance_relevance
- `16: state.getPublicSpecialties.mockResolvedValue(new Response(JSON.stringify({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 7, patient_id: "private-patient" }] }), { status: 200 }));`
- `18: expect(html).toContain("Cardiology");`
- `28: expect(html).not.toContain("Cardiology");`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
