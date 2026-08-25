# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/Analytics.ts`
- **Member SHA-256:** `a8757bf161a96219298483e5950ac790d06907fab0e6e20e4b816e9c66e7b32b`
- **Line count:** 146
- **Read range:** `1-146`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `30: screen(name: string, properties?: Record<string, unknown>): void;`
- `47: screen(name: string) {`
- `48: if (__DEV__) console.log('[Analytics:screen]', name);`
- `68: registerProvider(provider: AnalyticsProvider): void {`
- `93: screen(name: string, properties?: Record<string, unknown>): void {`
- `96: try { p.screen(name, properties); } catch { /* never throw */ }`
- `114: LOGIN_STARTED:      'login_started',`
- `115: LOGIN_SUCCESS:      'login_success',`
- `116: LOGIN_FAILED:       'login_failed',`
- `117: LOGOUT:             'logout',`
- `118: REGISTER_STARTED:   'register_started',`
- `119: REGISTER_SUCCESS:   'register_success',`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `114: LOGIN_STARTED:      'login_started',`
- `115: LOGIN_SUCCESS:      'login_success',`
- `116: LOGIN_FAILED:       'login_failed',`
- `117: LOGOUT:             'logout',`
### state_transitions
- `115: LOGIN_SUCCESS:      'login_success',`
- `116: LOGIN_FAILED:       'login_failed',`
- `119: REGISTER_SUCCESS:   'register_success',`
- `129: CONSULT_COMPLETED:  'consult_completed',`
- `135: TOUR_COMPLETED:     'tour_completed',`
- `141: ERROR_SHOWN:        'error_shown',`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `82: try { p.track(event); } catch { /* never throw */ }`
- `89: try { p.identify(properties); } catch { /* never throw */ }`
- `96: try { p.screen(name, properties); } catch { /* never throw */ }`
- `102: try { p.reset(); } catch { /* never throw */ }`
- `116: LOGIN_FAILED:       'login_failed',`
- `141: ERROR_SHOWN:        'error_shown',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
