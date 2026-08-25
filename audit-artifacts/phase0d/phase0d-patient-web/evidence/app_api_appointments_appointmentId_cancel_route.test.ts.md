# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/cancel/route.test.ts`
- **Member SHA-256:** `c2e866afe466eae9624a7f9e15fb39983aeb1cd73b54594b9edbb474b9ce54f2`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { POST } from "./route";`
- `6: function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":"cancel-key-123456",...headers},body:JSON.s`
- `7: describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and session",async()=>{expect((await POST`
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `6: function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":"cancel-key-123456",...headers},body:JSON.s`
### auth_ownership
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `7: describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and session",async()=>{expect((await POST`
### state_transitions
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `6: function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":"cancel-key-123456",...headers},body:JSON.s`
- `7: describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and session",async()=>{expect((await POST`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":"cancel-key-123456",...headers},body:JSON.s`
- `7: describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires key and session",async()=>{expect((await POST`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
