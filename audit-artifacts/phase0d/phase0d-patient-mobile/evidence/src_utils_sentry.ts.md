# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/sentry.ts`
- **Member SHA-256:** `370685fdfd726015f148a10e467c5446c8836b4dc83c213a8cfc1d6c1ab656aa`
- **Line count:** 58
- **Read range:** `1-58`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `34: enableAutoSessionTracking: true,`
### state_transitions
- `14: console.warn('[Sentry] Failed to load Sentry native module:', e);`
- `23: console.warn('[Sentry] DSN not configured, error monitoring is disabled.');`
- `37: console.log('[Sentry] Initialized successfully');`
- `39: console.warn('[Sentry] Init failed:', e.message);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `13: } catch (e) {`
- `14: console.warn('[Sentry] Failed to load Sentry native module:', e);`
- `23: console.warn('[Sentry] DSN not configured, error monitoring is disabled.');`
- `38: } catch (e: any) {`
- `39: console.warn('[Sentry] Init failed:', e.message);`
- `57: } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
