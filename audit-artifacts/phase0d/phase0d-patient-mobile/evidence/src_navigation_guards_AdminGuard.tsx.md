# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/navigation/guards/AdminGuard.tsx`
- **Member SHA-256:** `1762a995472414974c703ed4bd59f21dbeba7f0de7bf1fd4299abdf133cd71be`
- **Line count:** 49
- **Read range:** `1-49`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { useRouter } from 'expo-router';`
- `11: const router = useRouter();`
- `28: }, [user, router]);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `6: export interface AdminGuardProps {`
- `10: export function AdminGuard({ children }: AdminGuardProps) {`
- `13: const [isAdmin, setIsAdmin] = useState(false);`
- `18: const userRole = user?.role || 'user';`
- `20: if (userRole !== 'admin') {`
- `21: setIsAdmin(false);`
- `25: setIsAdmin(true);`
- `38: if (!isAdmin) {`
- `42: Access Denied. Admin privileges required.`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `12: const [isReady, setIsReady] = useState(false);`
- `13: const [isAdmin, setIsAdmin] = useState(false);`
- `15: const user = useAppSelector(state => state.auth.user);`
- `22: // Could redirect or just show an error state`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `22: // Could redirect or just show an error state`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
