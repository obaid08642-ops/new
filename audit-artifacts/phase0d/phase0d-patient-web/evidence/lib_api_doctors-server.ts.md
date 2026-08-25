# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors-server.ts`
- **Member SHA-256:** `e8f17f0393cc1df9db7d87a64dca54c18eae7d982b867af3167122ddecf11c96`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { patientApiUrl } from "@/lib/api/upstream";`
- `5: try { return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `10: try { return await fetch(patientApiUrl(`/care/doctors/${doctorId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `15: try { return await fetch(patientApiUrl(doctorSlotsQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: if (!/^[A-Za-z0-9_-]{1,128}$/.test(doctorId)) throw new Error("invalid_doctor_id");`
- `14: if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.date)) throw new Error("invalid_slots_query");`
### payment_insurance_relevance
- `4: export async function getPublicDoctors(input: { search?: string; specialty?: string; sort?: "rating" | "price" | "wait" } = {}): Promise<Response | null> {`
### error_empty_loading_retry_cancel
- `5: try { return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `9: if (!/^[A-Za-z0-9_-]{1,128}$/.test(doctorId)) throw new Error("invalid_doctor_id");`
- `10: try { return await fetch(patientApiUrl(`/care/doctors/${doctorId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `14: if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.date)) throw new Error("invalid_slots_query");`
- `15: try { return await fetch(patientApiUrl(doctorSlotsQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
