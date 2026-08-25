# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/doctors/doctors-ssr.test.ts`
- **Member SHA-256:** `2e27b50dac3932db5029a9f3f737397c2125d9644263418476f05246ecb9b31f`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: const state=vi.hoisted(()=>({get:vi.fn()})); vi.mock("next-intl/server",()=>({getTranslations:async()=> (k:string)=>k,setRequestLocale:vi.fn()})); vi.mock("@/lib/i18n",()=>({isLocale:()=>true})); vi.mock("@/lib/api/doctors-server",()=>({get`
- `3: describe("doctors SSR",()=>{beforeEach(()=>state.get.mockReset());it("renders public doctor fields without private data",async()=>{state.get.mockResolvedValue(new Response(JSON.stringify([{id:"doc-1",name_en:"Verified Doctor",patient_id:"pr`
### backend_consumers_or_contracts
- `2: const state=vi.hoisted(()=>({get:vi.fn()})); vi.mock("next-intl/server",()=>({getTranslations:async()=> (k:string)=>k,setRequestLocale:vi.fn()})); vi.mock("@/lib/i18n",()=>({isLocale:()=>true})); vi.mock("@/lib/api/doctors-server",()=>({get`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: const state=vi.hoisted(()=>({get:vi.fn()})); vi.mock("next-intl/server",()=>({getTranslations:async()=> (k:string)=>k,setRequestLocale:vi.fn()})); vi.mock("@/lib/i18n",()=>({isLocale:()=>true})); vi.mock("@/lib/api/doctors-server",()=>({get`
- `3: describe("doctors SSR",()=>{beforeEach(()=>state.get.mockReset());it("renders public doctor fields without private data",async()=>{state.get.mockResolvedValue(new Response(JSON.stringify([{id:"doc-1",name_en:"Verified Doctor",patient_id:"pr`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
