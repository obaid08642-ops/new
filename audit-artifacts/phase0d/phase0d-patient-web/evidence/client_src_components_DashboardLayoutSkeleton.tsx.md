# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/DashboardLayoutSkeleton.tsx`
- **Member SHA-256:** `7b6eab8ac4d4118bdf2be88f23e7db5318d975ac03e6451f773d5eb15feb34cc`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: <div className="flex min-h-screen bg-background">`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { Skeleton } from './ui/skeleton';`
- `3: export function DashboardLayoutSkeleton() {`
- `6: {/* Sidebar skeleton */}`
- `10: <Skeleton className="h-8 w-8 rounded-md" />`
- `11: <Skeleton className="h-4 w-24" />`
- `16: <Skeleton className="h-10 w-full rounded-lg" />`
- `17: <Skeleton className="h-10 w-full rounded-lg" />`
- `18: <Skeleton className="h-10 w-full rounded-lg" />`
- `24: <Skeleton className="h-9 w-9 rounded-full" />`
- `26: <Skeleton className="h-3 w-20" />`
- `27: <Skeleton className="h-2 w-32" />`
- `33: {/* Main content skeleton */}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
