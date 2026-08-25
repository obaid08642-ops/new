# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicines/medicines-ssr.test.ts`
- **Member SHA-256:** `db885246617595884c44e6f6c4cfdb495c45de62c2d627192cef08e909dfeeb7`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: import MedicinesPage from "./page";`
- `18: import MedicineDetailPage from "./[medicineId]/page";`
- `33: const html = renderToStaticMarkup(await MedicinesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "catalog", page: "1" }) }));`
- `35: expect(state.getPatientMedicines).toHaveBeenCalledWith(serverToken, { q: "catalog", page: 1 });`
- `44: const html = renderToStaticMarkup(await MedicineDetailPage({ params: Promise.resolve({ locale: "en", medicineId }) }));`
### backend_consumers_or_contracts
- `13: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `14: vi.mock("@/lib/api/medicines-server", () => ({ getPatientMedicines: state.getPatientMedicines }));`
- `15: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));`
### auth_ownership
- `13: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `21: const serverToken = "server-only-medicine-access-token-never-in-html";`
- `27: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `30: it("renders bounded catalog results through the server boundary without embedding the token", async () => {`
- `35: expect(state.getPatientMedicines).toHaveBeenCalledWith(serverToken, { q: "catalog", page: 1 });`
- `36: expect(html).not.toContain(serverToken);`
- `41: it("renders published medicine detail through the public allowlist without a patient session or a price", async () => {`
- `48: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({`
- `13: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `14: vi.mock("@/lib/api/medicines-server", () => ({ getPatientMedicines: state.getPatientMedicines }));`
- `15: vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));`
- `25: state.getPatientMedicines.mockReset();`
- `26: state.getPublicMedicine.mockReset();`
- `27: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `31: state.getPatientMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99 }]), { status: 200 }));`
- `35: expect(state.getPatientMedicines).toHaveBeenCalledWith(serverToken, { q: "catalog", page: 1 });`
- `42: state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }), { status: 200 }));`
- `46: expect(state.getPublicMedicine).toHaveBeenCalledWith(medicineId);`
- `47: expect(state.requirePatientAccess).not.toHaveBeenCalled();`
### payment_insurance_relevance
- `31: state.getPatientMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99 }]), { status: 200 }));`
- `41: it("renders published medicine detail through the public allowlist without a patient session or a price", async () => {`
- `42: state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({ id: medicineId, name_en: "Catalog medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }), { status: 200 }));`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
