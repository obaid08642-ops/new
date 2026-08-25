# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/Toast.tsx`
- **Member SHA-256:** `9b58046ecd21442f26f977767d7bf78187996141c067ed0183b506147e61e063`
- **Line count:** 302
- **Read range:** `1-302`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `30: action?: { label: string; onPress: () => void };`
- `241: <TouchableOpacity onPress={toast.action.onPress} hitSlop={{ top: 8, bottom: 8 }}>`
- `251: onPress={() => onDismiss(toast.id)}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: import { BorderRadius, Spacing, Shadows, Animation } from '../tokens';`
- `221: accessibilityRole="alert"`
- `253: accessibilityRole="button"`
### state_transitions
- `6: import React, { createContext, useContext, useRef, useState, useCallback } from 'react';`
- `20: export type ToastType = 'success' | 'error' | 'warning' | 'info';`
- `34: interface ToastState extends ToastConfig {`
- `45: success: 'check_circle',`
- `46: error:   'error_outline',`
- `63: if (!ctx) throw new Error('useToast must be inside <ToastProvider>');`
- `71: const [toasts, setToasts] = useState<ToastState[]>([]);`
- `79: const toast: ToastState = {`
- `158: toasts: ToastState[];`
- `197: toast: ToastState;`
- `267: case 'success': return { accent: colors.success, bg: '#EBF6E9' };`
- `268: case 'error':   return { accent: colors.error,   bg: '#FEF2F2' };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: export type ToastType = 'success' | 'error' | 'warning' | 'info';`
- `46: error:   'error_outline',`
- `63: if (!ctx) throw new Error('useToast must be inside <ToastProvider>');`
- `107: setTimeout(() => dismiss(id), duration);`
- `268: case 'error':   return { accent: colors.error,   bg: '#FEF2F2' };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
