# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-services-server.ts`
- **Member SHA-256:** `82fba1ce94de8528cfc2b74e8373e21e1f3b82ea41d7a47011cbf70d6be3a0a0`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { patientApiUrl } from "@/lib/api/upstream";`
- `2: import { parseHomeCareServiceId } from "./home-care-services";`
- `5: if (path === "/home-care/services") return path;`
- `6: const match = path.match(/^\/home-care\/services\/([^/]+)$/);`
- `13: try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `18: try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: if (!match || !parseHomeCareServiceId(match[1]).success) throw new Error("invalid_home_care_service_path");`
- `17: if (!parseHomeCareServiceId(serviceId).success) throw new Error("invalid_home_care_service_id");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: if (!match || !parseHomeCareServiceId(match[1]).success) throw new Error("invalid_home_care_service_path");`
- `13: try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `17: if (!parseHomeCareServiceId(serviceId).success) throw new Error("invalid_home_care_service_id");`
- `18: try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
