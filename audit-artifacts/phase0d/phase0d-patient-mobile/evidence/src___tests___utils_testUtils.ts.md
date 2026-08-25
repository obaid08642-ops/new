# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/__tests__/utils/testUtils.ts`
- **Member SHA-256:** `3afd364633ff7499c1e5f0c0059b5a484479f3aee58a4479fd4eb304dea20908`
- **Line count:** 151
- **Read range:** `1-151`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `30: maxLoginAttempts: 5,`
- `38: maxFileUploadMb:  20,`
- `42: defaultPageSize:  20,`
- `43: maxPageSize:      100,`
- `73: screen:     jest.fn(),`
- `116: page:       1,`
- `117: pageSize:   20,`
- `118: totalPages: Math.ceil((total ?? items.length) / 20),`
### backend_consumers_or_contracts
- `18: apiBaseUrl:       'http://localhost:8002/api/v1',`
- `20: socketUrl:        'ws://localhost:8002',`
### auth_ownership
- `29: tokenExpiryBuffer: 60_000,`
- `30: maxLoginAttempts: 5,`
- `53: roles: { PATIENT: 'patient', GUEST: 'guest' },`
- `103: role:           'patient',`
- `144: const { container, Tokens } = require('../../core/di/Container');`
- `146: container.bindSingleton(Tokens.Logger,       mockLogger);`
- `147: container.bindSingleton(Tokens.Analytics,    mockAnalytics);`
- `148: container.bindSingleton(Tokens.FeatureFlags, mockFeatureFlags);`
- `149: container.bindSingleton(Tokens.Config,       mockConfig);`
### state_transitions
- `63: error: jest.fn(),`
### payment_insurance_relevance
- `107: walletBalance:  0,`
- `112: export function createMockPaginatedResult<T>(items: T[], total?: number) {`
- `115: total:      total ?? items.length,`
- `118: totalPages: Math.ceil((total ?? items.length) / 20),`
### error_empty_loading_retry_cancel
- `26: apiTimeout:       5000,`
- `41: offlineQueueMax:  50,`
- `63: error: jest.fn(),`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
