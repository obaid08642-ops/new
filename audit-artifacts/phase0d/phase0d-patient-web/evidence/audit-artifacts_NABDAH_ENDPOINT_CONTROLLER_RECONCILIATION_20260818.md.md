# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_ENDPOINT_CONTROLLER_RECONCILIATION_20260818.md`
- **Member SHA-256:** `e94f109782a17fc549c6f49cdcbb8ef7a9c7aca2816d1a7c4a090b18e333e0e4`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: This result is **triage only, not a defect count**. Backend controllers commonly compose routes from class-level `@Controller()` prefixes, dynamic `:id` parameters, constants, and nested modules, while consumers may include query strings or`
- `7: Required next step is a route compiler that reads class-level and method-level decorators, normalizes dynamic segments/query strings, and then maps each consumer call to an exact controller route and HTTP method. Only after that pass may a `
### backend_consumers_or_contracts
- `5: This result is **triage only, not a defect count**. Backend controllers commonly compose routes from class-level `@Controller()` prefixes, dynamic `:id` parameters, constants, and nested modules, while consumers may include query strings or`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
