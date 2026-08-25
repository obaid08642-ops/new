# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/core/DatabaseHealthChecker.ts`
- **Member SHA-256:** `877fff3ec04932fb338769bcd99dba058d5ac64e15446598883eb35227b3d079`
- **Line count:** 46
- **Read range:** `1-46`
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
- `19: // SQLite returns a row with 'ok' if there are no errors`
- `22: } catch (error) {`
- `23: console.error('[DatabaseHealthChecker] Integrity check failed', error);`
- `41: } catch (error) {`
- `42: console.error('[DatabaseHealthChecker] Ping failed', error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `19: // SQLite returns a row with 'ok' if there are no errors`
- `22: } catch (error) {`
- `23: console.error('[DatabaseHealthChecker] Integrity check failed', error);`
- `41: } catch (error) {`
- `42: console.error('[DatabaseHealthChecker] Ping failed', error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
