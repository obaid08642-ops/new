# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/schema/indexes.ts`
- **Member SHA-256:** `40cabab544dfff1ff01d57819b2920b2324e9c9b33f36f5520c26b072fdaad62`
- **Line count:** 20
- **Read range:** `1-20`
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
- `9: `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);`,`
- `10: `CREATE INDEX IF NOT EXISTS idx_sync_metadata_status ON sync_metadata(sync_status);`,`
- `19: `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
