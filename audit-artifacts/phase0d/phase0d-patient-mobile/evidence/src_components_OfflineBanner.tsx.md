# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/OfflineBanner.tsx`
- **Member SHA-256:** `6cb19b221d886adce5a9ad6aba5cf165d8dbe7cda807f20a43b163c846eba1c9`
- **Line count:** 55
- **Read range:** `1-55`
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
- `1: import React, { useEffect, useState } from 'react';`
- `10: const [offline, setOffline] = useState(false);`
- `11: const [justBack, setJustBack] = useState(false);`
- `12: const anim = useState(() => new Animated.Value(0))[0];`
- `15: const unsub = NetInfo.addEventListener((state) => {`
- `16: const isOff = !(state.isConnected ?? true);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `6: * Global connectivity banner — shows a slim banner when offline and a brief`
- `9: export default function OfflineBanner() {`
- `10: const [offline, setOffline] = useState(false);`
- `17: setOffline((prev) => {`
- `20: setTimeout(() => setJustBack(false), 2500);`
- `29: Animated.timing(anim, { toValue: offline || justBack ? 1 : 0, duration: 250, useNativeDriver: true }).start();`
- `30: }, [offline, justBack, anim]);`
- `32: if (!offline && !justBack) return null;`
- `38: { backgroundColor: offline ? '#F0567A' : '#2BB89C', transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }] },`
- `43: {offline ? 'لا يوجد اتصال بالإنترنت — وضع الأوفلاين' : 'عاد الاتصال — جاري المزامنة...'}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
