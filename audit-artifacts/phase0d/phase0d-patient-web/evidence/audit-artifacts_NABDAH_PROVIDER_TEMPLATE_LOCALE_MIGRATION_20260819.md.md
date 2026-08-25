# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_TEMPLATE_LOCALE_MIGRATION_20260819.md`
- **Member SHA-256:** `a6b67c76b9a02e885398b62447e480a5b78aabe0a2e3412855ef13c52312f991`
- **Line count:** 57
- **Read range:** `1-57`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `28: `src/i18n/providerTextTranslations.ts` now provides `translateProviderTemplate(locale, ar, en, values)`. It resolves Arabic and English directly, looks up Urdu/Hindi/Bengali/Filipino templates by source pair, and substitutes only numbered p`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `54: 2. The provider service-agreement content and other legal/contract surfaces require owner legal/product approval before generating or presenting translations; this is not an automatic translation task.`
### state_transitions
- `24: | Batch generation rows | 5 / 5; zero errors |`
- `36: | Batch output | **5 / 5 complete; 0 errors** |`
- `37: | Placeholder/key/non-empty validation | **PASS — 82 records** |`
- `53: 1. Ten templates use different expressions by locale (for example `.ar`/`.en` fields or Arabic-specific status conditionals). Each must be redesigned to pass a locale-neutral value or an explicitly localized server value.`
- `55: 3. Dynamic API responses, push notifications, server error messages, dates/numbers, accessibility labels, visual wrapping, font coverage, and RTL/LTR device behavior remain subject to source and human acceptance review.`
### payment_insurance_relevance
- `15: These templates can carry count, date, price, identifier, user-entered, or backend-provided values. A safe migration must translate the surrounding language while preserving the expressions exactly, rather than translating or serializing a `
- `55: 3. Dynamic API responses, push notifications, server error messages, dates/numbers, accessibility labels, visual wrapping, font coverage, and RTL/LTR device behavior remain subject to source and human acceptance review.`
- `57: No deployment, account mutation, medical action, payment, legal consent, or production data access occurred in this batch.`
### error_empty_loading_retry_cancel
- `24: | Batch generation rows | 5 / 5; zero errors |`
- `36: | Batch output | **5 / 5 complete; 0 errors** |`
- `37: | Placeholder/key/non-empty validation | **PASS — 82 records** |`
- `55: 3. Dynamic API responses, push notifications, server error messages, dates/numbers, accessibility labels, visual wrapping, font coverage, and RTL/LTR device behavior remain subject to source and human acceptance review.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
