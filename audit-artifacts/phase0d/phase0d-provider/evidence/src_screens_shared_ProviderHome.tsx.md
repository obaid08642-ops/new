# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/ProviderHome.tsx`
- **Member SHA-256:** `c67cf757045bf0320048a20b4ddb3a758df9ae368c4feb986fd28b6e2d3beeb8`
- **Line count:** 88
- **Read range:** `1-88`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `35: navigation.navigate('LiveKitRoomProvider', { roomId: item.roomId });`
- `37: navigation.navigate('PharmacyChatResponder', { threadId: item.threadId, patientName: item.name });`
- `66: onPress={() => handleAction(item)}`
### backend_consumers_or_contracts
- `18: const res = await apiFetch('/pharmacy/orders/pending');`
- `21: const res = await apiFetch('/calls/provider/waiting-room');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `10: const [items, setItems] = useState<any[]>([]);`
- `11: const [loading, setLoading] = useState(false);`
- `15: setLoading(true);`
- `18: const res = await apiFetch('/pharmacy/orders/pending');`
- `28: setLoading(false);`
- `48: {loading ? (`
### payment_insurance_relevance
- `56: <View style={[styles.card, { backgroundColor: theme.surface }]}>`
- `57: <View style={styles.cardHeader}>`
- `58: <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>`
- `83: card: { padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2 },`
- `84: cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },`
- `85: cardName: { fontSize: 18, fontWeight: 'bold' },`
### error_empty_loading_retry_cancel
- `11: const [loading, setLoading] = useState(false);`
- `15: setLoading(true);`
- `18: const res = await apiFetch('/pharmacy/orders/pending');`
- `24: } catch (err) {`
- `28: setLoading(false);`
- `48: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
