# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_FULL_LOCALE_STATIC_TEXT_MIGRATION_20260819.md`
- **Member SHA-256:** `97a70e6d6f261e9407f84232c93fd49c686a382e202ca1e61eb102dc83459b10`
- **Line count:** 53
- **Read range:** `1-53`
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
- `9: The provider app contained a large number of direct presentation branches in the form `AR ? Arabic : English`. Those branches supplied Arabic or English only, so Urdu, Hindi, Bengali, and Filipino generally received English text even though`
- `19: | Batch output rows | 113 / 113, zero generation errors |`
- `20: | Key/order/empty-value validation | PASS |`
- `24: The generated source module is `src/i18n/providerTextTranslations.ts`. It exposes `translateProviderPair(locale, ar, en)` and declares the verified pair count (`2,810`). Each migrated component creates a local `tr(ar, en)` helper from its e`
- `30: | Translation batch completion | **113 / 113 complete; 0 errors** |`
- `31: | Strict key/order/non-empty validation | **PASS — 2,810 records** |`
- `48: 2. The migration covers the extracted **quoted direct AR/EN text-branch pattern**. Dynamic API text, server errors, push notifications, user-entered text, date/number formatting, and template-literal cases require their own source/contract `
### payment_insurance_relevance
- `47: 1. **Machine translations are not human clinical localization approval.** The generated Urdu, Hindi, Bengali, and Filipino content requires fluent reviewer approval, especially medical, legal, insurance, financial, and consent language.`
- `49: 3. Direction and layout branches remain intentionally controlled by Arabic-only RTL. They require visual device testing in all six languages for truncation, wrapping, focus order, font coverage, large text, and orientation.`
- `51: 5. This batch does not close any emergency, QR, consent, location, payments, security, backend contract, sandbox E2E, signed-build, or deployment-approval blocker.`
### error_empty_loading_retry_cancel
- `19: | Batch output rows | 113 / 113, zero generation errors |`
- `20: | Key/order/empty-value validation | PASS |`
- `30: | Translation batch completion | **113 / 113 complete; 0 errors** |`
- `31: | Strict key/order/non-empty validation | **PASS — 2,810 records** |`
- `48: 2. The migration covers the extracted **quoted direct AR/EN text-branch pattern**. Dynamic API text, server errors, push notifications, user-entered text, date/number formatting, and template-literal cases require their own source/contract `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
