# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/context/DiagnosticsCartContext.tsx`
- **Member SHA-256:** `4f1cec9e1680dc302805d1ea4be83a397587bf553bd73610ec86c79abbf886df`
- **Line count:** 135
- **Read range:** `1-135`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `57: { text: 'إلغاء', style: 'cancel' },`
- `61: onPress: () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: lockedProviderId?: string;`
- `24: lockedProviderId: string | null;`
- `44: const [lockedProviderId, setLockedProviderId] = useState<string | null>(null);`
- `52: if (lockedProviderId && item.lockedProviderId && item.lockedProviderId !== lockedProviderId) {`
- `63: setLockedProviderId(item.lockedProviderId || null);`
- `72: if (!lockedProviderId && item.lockedProviderId) {`
- `73: setLockedProviderId(item.lockedProviderId);`
- `85: }, [items, lockedProviderId]);`
- `90: if (newItems.length === 0) setLockedProviderId(null);`
- `98: if (newItems.length === 0) setLockedProviderId(null);`
- `106: if (items.filter(i => i.kind !== kind).length === 0) setLockedProviderId(null);`
- `109: setLockedProviderId(null);`
### state_transitions
- `1: import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';`
- `25: addItem: (item: Omit<DiagnosticsCartItem, 'qty'> & { qty?: number }) => Promise<{ success: boolean; message?: string }>;`
- `43: const [items, setItems] = useState<DiagnosticsCartItem[]>([]);`
- `44: const [lockedProviderId, setLockedProviderId] = useState<string | null>(null);`
- `45: const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);`
- `46: const [paymentType, setPaymentType] = useState<'cash' | 'insurance'>('cash');`
- `47: const [homeVisitFeeState, setHomeVisitFee] = useState<number>(0);`
- `57: { text: 'إلغاء', style: 'cancel' },`
- `68: return { success: false, message: 'Cart restricted' };`
- `84: return { success: true };`
- `117: const total = subtotal + homeVisitFeeState;`
- `122: itemCount, subtotal, homeVisitFee: homeVisitFeeState, total,`
### payment_insurance_relevance
- `9: price: number;`
- `30: subtotal: number;`
- `32: total: number;`
- `35: paymentType: 'cash' | 'insurance';`
- `36: setPaymentType: (type: 'cash' | 'insurance') => void;`
- `46: const [paymentType, setPaymentType] = useState<'cash' | 'insurance'>('cash');`
- `115: const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.qty, 0), [items]);`
- `117: const total = subtotal + homeVisitFeeState;`
- `122: itemCount, subtotal, homeVisitFee: homeVisitFeeState, total,`
- `124: paymentType, setPaymentType, hasHomeVisit`
### error_empty_loading_retry_cancel
- `57: { text: 'إلغاء', style: 'cancel' },`
- `133: if (!ctx) throw new Error('useDiagnosticsCart must be used inside DiagnosticsCartProvider');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
