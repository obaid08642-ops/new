# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/reschedule/route.test.ts`
- **Member SHA-256:** `877cd146d1170631216fb488a7a704841e63ee4b96d1be34a95c664ae29ce7b0`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { PATCH } from "./route";`
- `6: function req(headers:HeadersInit={},body:unknown={scheduled_at:"2030-01-01T10:00:00.000Z"}){return new Request(`https://web.test/api/appointments/${id}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key"`
- `7: describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and valid future slot payload",async(`
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `6: function req(headers:HeadersInit={},body:unknown={scheduled_at:"2030-01-01T10:00:00.000Z"}){return new Request(`https://web.test/api/appointments/${id}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key"`
### auth_ownership
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `7: describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and valid future slot payload",async(`
### state_transitions
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `7: describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and valid future slot payload",async(`
### payment_insurance_relevance
- `7: describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and valid future slot payload",async(`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
