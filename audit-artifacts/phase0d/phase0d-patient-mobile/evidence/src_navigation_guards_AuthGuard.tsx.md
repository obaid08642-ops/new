# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/navigation/guards/AuthGuard.tsx`
- **Member SHA-256:** `3e3f47eeddae7c97cdd48d78c092c437df0b093d2081f30a7b4d8de9b31ba94b`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { useRouter, useSegments } from 'expo-router';`
- `12: const router = useRouter();`
- `24: // Redirect to login if auth is required but user is not authenticated`
- `25: router.replace('/(auth)/login');`
- `28: router.replace('/');`
- `35: }, [isAuthenticated, segments, requireAuth, requireGuest, router]);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: // Redirect to login if auth is required but user is not authenticated`
- `25: router.replace('/(auth)/login');`
### state_transitions
- `1: import React, { useEffect, useState } from 'react';`
- `14: const [isReady, setIsReady] = useState(false);`
- `16: const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
