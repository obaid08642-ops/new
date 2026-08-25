# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/index.ts`
- **Member SHA-256:** `33a2c29915d95aed76079d0d52b191fd82a188b431dc4e3ae42b651cebc103b3`
- **Line count:** 109
- **Read range:** `1-109`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: REGISTER,`
- `76: ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],`
### backend_consumers_or_contracts
- `22: import { baseApi } from './api/baseApi';`
- `28: import authReducer from './slices/authSlice';`
- `31: import appointmentsReducer from './slices/appointmentsSlice';`
- `32: import notificationsReducer from './slices/notificationsSlice';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `54: const rootReducer = (state: any, action: UnknownAction) => {`
- `58: state = undefined;`
- `60: store?.dispatch(baseApi.util.resetApiState());`
- `64: return reducerManager.reduce(state, action);`
- `78: immutableCheck: true, // Warns if state is mutated directly`
- `105: export type RootState = ReturnType<typeof rootReducer>;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `97: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
