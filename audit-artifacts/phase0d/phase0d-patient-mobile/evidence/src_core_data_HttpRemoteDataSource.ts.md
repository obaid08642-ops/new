# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/HttpRemoteDataSource.ts`
- **Member SHA-256:** `9cbb53d2e6925755a4307a37ac122a3ba3c6dbbc8204728bd7fa02185d036523`
- **Line count:** 102
- **Read range:** `1-102`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `36: page:     String(params.page),`
- `37: page_size: String(params.pageSize ?? 20),`
- `56: const pageSize = params?.pageSize ?? 20;`
- `60: page: params?.page ?? 1,`
- `61: pageSize,`
- `62: totalPages: Math.ceil(list.count / pageSize),`
- `71: page: data.meta?.page ?? 1,`
- `72: pageSize: params?.pageSize ?? items.length,`
- `73: totalPages: data.meta?.totalPages ?? 1,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `59: total: list.count,`
- `62: totalPages: Math.ceil(list.count / pageSize),`
- `70: total: data.meta?.totalCount ?? items.length,`
- `73: totalPages: data.meta?.totalPages ?? 1,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
