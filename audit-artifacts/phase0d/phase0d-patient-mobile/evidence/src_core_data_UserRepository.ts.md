# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/UserRepository.ts`
- **Member SHA-256:** `d86211278e4e9784657c9ab448642c6c58d399be3409360fad9e82690a063840`
- **Line count:** 63
- **Read range:** `1-63`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: const remoteRes = await this.remote.getAll({ search: email, page: 1, pageSize: 1 });`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `30: console.warn('[UserRepository] findByEmail error', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `29: } catch (e) {`
- `30: console.warn('[UserRepository] findByEmail error', e);`
- `40: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
