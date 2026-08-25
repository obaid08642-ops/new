# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/ScreenStates.tsx`
- **Member SHA-256:** `310b06ce9b5faa89469ddf36bb3e9d2f1e2edd98b7d53502dd783ade789ba808`
- **Line count:** 120
- **Read range:** `1-120`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: * M1-05 — Unified screen states (Loading / Empty / Error).`
- `9: * Before this, only 17% of screens had any empty state and most failures were`
- `10: * silently swallowed behind static fake data. Wrap any data-driven screen:`
- `12: *   <ScreenState loading={loading} error={error} empty={items.length === 0}`
- `13: *                onRetry={reload} emptyTitle="لا توجد مواعيد">`
- `15: *   </ScreenState>`
- `20: interface ScreenStateProps {`
- `27: onRetry?: () => void;`
- `31: export function ScreenState({`
- `38: onRetry,`
- `40: }: ScreenStateProps) {`
- `66: {onRetry && (`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `68: <Icon name="refresh" size={18} color="#fff" />`
- `92: <Icon name="refresh" size={18} color="#fff" />`
### state_transitions
- `8: * M1-05 — Unified screen states (Loading / Empty / Error).`
- `9: * Before this, only 17% of screens had any empty state and most failures were`
- `12: *   <ScreenState loading={loading} error={error} empty={items.length === 0}`
- `13: *                onRetry={reload} emptyTitle="لا توجد مواعيد">`
- `15: *   </ScreenState>`
- `20: interface ScreenStateProps {`
- `21: loading?: boolean;`
- `22: error?: string | null;`
- `23: empty?: boolean;`
- `24: emptyTitle?: string;`
- `25: emptySubtitle?: string;`
- `26: emptyIcon?: IconName;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: * M1-05 — Unified screen states (Loading / Empty / Error).`
- `9: * Before this, only 17% of screens had any empty state and most failures were`
- `12: *   <ScreenState loading={loading} error={error} empty={items.length === 0}`
- `13: *                onRetry={reload} emptyTitle="لا توجد مواعيد">`
- `21: loading?: boolean;`
- `22: error?: string | null;`
- `23: empty?: boolean;`
- `24: emptyTitle?: string;`
- `25: emptySubtitle?: string;`
- `26: emptyIcon?: IconName;`
- `27: onRetry?: () => void;`
- `32: loading,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
