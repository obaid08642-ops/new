# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/AsyncStorageDataSource.ts`
- **Member SHA-256:** `3260dca994aa33499603795cad2b2695f842c284b51ae0891aa3d27e8b377609`
- **Line count:** 101
- **Read range:** `1-101`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: } catch {`
- `40: } catch {`
- `49: } catch { /* ignore */ }`
- `60: } catch { /* ignore */ }`
- `67: } catch { /* ignore */ }`
- `75: } catch { /* ignore */ }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
