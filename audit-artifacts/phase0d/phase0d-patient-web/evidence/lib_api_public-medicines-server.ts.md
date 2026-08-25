# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/public-medicines-server.ts`
- **Member SHA-256:** `f24cf2219f11b18804967a006a8bde8a7817206a3c251e8494610a8a8bdfe022`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export async function getPublicMedicines(search: { q?: string; page: number }): Promise<Response | null> {`
### backend_consumers_or_contracts
- `1: import { medicineQuery, parseMedicineId } from "@/lib/api/medicines";`
- `2: import { patientApiUrl } from "@/lib/api/upstream";`
- `14: return await fetch(patientApiUrl(publicMedicinePath(medicineQuery(search))), {`
- `26: return await fetch(patientApiUrl(publicMedicinePath(`/medicines/${medicineId}/details`)), {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: if (!listPath.test(path) && !detailPath.test(path)) throw new Error("invalid_public_medicine_path");`
- `24: if (!parseMedicineId(medicineId).success) throw new Error("invalid_public_medicine_id");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: if (!listPath.test(path) && !detailPath.test(path)) throw new Error("invalid_public_medicine_path");`
- `18: } catch {`
- `24: if (!parseMedicineId(medicineId).success) throw new Error("invalid_public_medicine_id");`
- `30: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
