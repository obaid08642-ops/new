# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/dates.ts`
- **Member SHA-256:** `d8c0949028a0cb084604bdf5c235a679359fe4a70809ee7486dbf69b82a9c7cf`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `51: /** Subscribe to pref changes (used by the settings screen). */`
### backend_consumers_or_contracts
- `51: /** Subscribe to pref changes (used by the settings screen). */`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: } catch {`
- `35: } catch {}`
- `47: await AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
