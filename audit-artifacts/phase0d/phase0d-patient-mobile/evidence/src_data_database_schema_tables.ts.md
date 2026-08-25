# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/schema/tables.ts`
- **Member SHA-256:** `c269987c1211ca2b9147e680f44e1ab4c3c0c2e1b311f36c975dcd4e5345454c`
- **Line count:** 422
- **Read range:** `1-422`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `366: retry_count INTEGER DEFAULT 0,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: `CREATE TABLE IF NOT EXISTS roles (`
- `42: `CREATE TABLE IF NOT EXISTS permissions (`
### state_transitions
- `60: status TEXT NOT NULL,`
- `144: status TEXT NOT NULL,`
- `157: status TEXT NOT NULL,`
- `365: status TEXT NOT NULL,`
- `366: retry_count INTEGER DEFAULT 0,`
- `379: status TEXT NOT NULL,`
- `400: // Core requirement: Sync Metadata table to decouple sync state`
- `407: sync_status TEXT NOT NULL,`
### payment_insurance_relevance
- `156: total_amount REAL NOT NULL,`
- `171: unit_price REAL NOT NULL,`
- `183: price REAL NOT NULL,`
- `221: `CREATE TABLE IF NOT EXISTS wallet (`
- `364: payload TEXT NOT NULL,`
- `378: payload TEXT,`
### error_empty_loading_retry_cancel
- `366: retry_count INTEGER DEFAULT 0,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
