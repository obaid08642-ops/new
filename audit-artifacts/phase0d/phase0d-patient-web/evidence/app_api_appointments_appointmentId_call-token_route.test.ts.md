# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/call-token/route.test.ts`
- **Member SHA-256:** `a06078c2e4c46ee0db7e61345bdef66d059460be0e74e8efec47d3a3448ae705`
- **Line count:** 6
- **Read range:** `1-6`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { GET } from "./route";`
- `6: describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires authenticated session and valid id",async()=>{state.c`
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
### auth_ownership
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `6: describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires authenticated session and valid id",async()=>{state.c`
### state_transitions
- `2: const state=vi.hoisted(()=>({call:vi.fn(),cookies:{get:vi.fn()}}));`
- `3: vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `6: describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it("requires authenticated session and valid id",async()=>{state.c`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
