# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/retry-button.tsx`
- **Member SHA-256:** `31467cd3cc2cd3bd3a183d01f05a4e7fabbb7dc723c2aaa3d80f71fc3c28a2f5`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { useRouter } from "next/navigation";`
- `6: export function RetryButton() {`
- `7: const router = useRouter();`
- `8: const t = useTranslations("RouteState");`
- `9: return <button className="button button-secondary" type="button" onClick={() => router.refresh()}>{t("retry")}</button>;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: return <button className="button button-secondary" type="button" onClick={() => router.refresh()}>{t("retry")}</button>;`
### state_transitions
- `6: export function RetryButton() {`
- `8: const t = useTranslations("RouteState");`
- `9: return <button className="button button-secondary" type="button" onClick={() => router.refresh()}>{t("retry")}</button>;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: export function RetryButton() {`
- `9: return <button className="button button-secondary" type="button" onClick={() => router.refresh()}>{t("retry")}</button>;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
