# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/hooks/useGuestGuard.tsx`
- **Member SHA-256:** `e366b5f95c6bd500ce63ef493cbb1d50851ec6eed1f3c9f4f52ea8fbbee1388d`
- **Line count:** 82
- **Read range:** `1-82`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `11: // The ONLY two areas that require a registered account:`
- `46: // (insurance / family) interrupt with the login prompt.`
- `56: { text: 'إلغاء', style: 'cancel' },`
- `59: onPress: () => router.push('/(auth)/login'),`
- `64: onPress: () => router.push('/(auth)/register'),`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `46: // (insurance / family) interrupt with the login prompt.`
- `59: onPress: () => router.push('/(auth)/login'),`
### state_transitions
- `1: import { useEffect, useState, useCallback } from 'react';`
- `36: const authState = useSelector((state: { auth: { isGuest: boolean; isAuthenticated: boolean } }) => state.auth);`
- `37: const isGuest = authState.isGuest;`
- `38: const checked = authState.isAuthenticated || authState.isGuest;`
- `56: { text: 'إلغاء', style: 'cancel' },`
### payment_insurance_relevance
- `12: //   1. INSURANCE (policies, claims, paying by insurance)`
- `22: 'insurance',`
- `23: 'insurance-add',`
- `24: 'insurance-claim',`
- `25: 'insurance-hub',`
- `46: // (insurance / family) interrupt with the login prompt.`
### error_empty_loading_retry_cancel
- `56: { text: 'إلغاء', style: 'cancel' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
