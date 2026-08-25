# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/__tests__/mocks/MockDataSources.ts`
- **Member SHA-256:** `5c6f9f3332c7e5f607c78bebcfd77accb75ae894256111e1b02cf13ba6fcbf58`
- **Line count:** 74
- **Read range:** `1-74`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `34: const page = params?.page ?? 1;`
- `35: const pageSize = params?.pageSize ?? 20;`
- `36: const start = (page - 1) * pageSize;`
- `38: items: items.slice(start, start + pageSize),`
- `40: page,`
- `41: pageSize,`
- `42: totalPages: Math.ceil(total / pageSize),`
- `43: hasMore: start + pageSize < total,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `21: if (!item) throw new Error(`Not found: ${id}`);`
- `55: if (!existing) throw new Error(`Not found: ${id}`);`
### payment_insurance_relevance
- `33: const total = items.length;`
- `39: total,`
- `42: totalPages: Math.ceil(total / pageSize),`
- `43: hasMore: start + pageSize < total,`
### error_empty_loading_retry_cancel
- `21: if (!item) throw new Error(`Not found: ${id}`);`
- `55: if (!existing) throw new Error(`Not found: ${id}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
