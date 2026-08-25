# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/labs-server.ts`
- **Member SHA-256:** `ec947e13bd323822224238a37fabf32de6d8fb97017c6ea9c95165748543cea7`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { patientApiUrl } from "@/lib/api/upstream";`
- `2: import { parseLabServiceId } from "./labs";`
- `13: try { return await fetch(patientApiUrl(`/labs/packages/${packageId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `27: const path = `/labs/services${query.toString() ? `?${query.toString()}` : ""}`;`
- `28: try { return await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `12: if (!parseLabServiceId(packageId).success) throw new Error("invalid_lab_package_id");`
### payment_insurance_relevance
- `4: const allowedSortFlags = new Set(["highest_rated", "nearest", "lowest_price"]);`
- `17: category?: string; search?: string; homeOnly?: boolean; highestRated?: boolean; nearest?: boolean; lowestPrice?: boolean;`
- `24: for (const [key, enabled] of [["highest_rated", params.highestRated], ["nearest", params.nearest], ["lowest_price", params.lowestPrice]] as const) {`
### error_empty_loading_retry_cancel
- `12: if (!parseLabServiceId(packageId).success) throw new Error("invalid_lab_package_id");`
- `13: try { return await fetch(patientApiUrl(`/labs/packages/${packageId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `28: try { return await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
