# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/specialties-server.ts`
- **Member SHA-256:** `89f7fce8f79f5d12e9adaab720556617c51a8dd11e6ecbb63839ef53cb825dc3`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: /** Public discovery contract: no patient token is sent and no private route is reachable. */`
### backend_consumers_or_contracts
- `1: import { patientApiUrl } from "@/lib/api/upstream";`
- `11: return await fetch(patientApiUrl(specialtiesPath("/care/specialties")), {`
### auth_ownership
- `8: /** Public discovery contract: no patient token is sent and no private route is reachable. */`
### state_transitions
- `4: if (path !== "/care/specialties") throw new Error("invalid_specialties_path");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `4: if (path !== "/care/specialties") throw new Error("invalid_specialties_path");`
- `15: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
