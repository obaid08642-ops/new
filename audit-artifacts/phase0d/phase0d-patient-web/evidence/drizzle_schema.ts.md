# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `drizzle/schema.ts`
- **Member SHA-256:** `4f673120db7988710f9dbe7abce5189e91af08c57cc3053069fcf9179fcd289c`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: loginMethod: varchar("loginMethod", { length: 64 }),`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `18: loginMethod: varchar("loginMethod", { length: 64 }),`
- `19: role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
