# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/deviceId.ts`
- **Member SHA-256:** `4dacc2d18c57fb380c41edf8a83f918fb2774c6ec2a093300a1f13a36e8b8039`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: // guest's orders / bookings / history survive app restarts and are merged into`
- `8: // their real account when they eventually register.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `22: } catch { /* storage read failed — fall through to regenerate */ }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `22: } catch { /* storage read failed — fall through to regenerate */ }`
- `27: } catch {`
- `30: try { await AsyncStorage.setItem(KEY, id); } catch { /* best-effort */ }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
