# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityInternalChatScreen.tsx`
- **Member SHA-256:** `e24674b2fa1cd28bf10c828ac5c62ae7d17e8fad8cb416a5f4a0f49f3ebec6c5`
- **Line count:** 126
- **Read range:** `1-126`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: export function FacilityInternalChatScreen({ onBack }: { onBack: () => void }) {`
- `88: <TouchableOpacity onPress={handleSend} style={{ width: 60, height: 44, borderRadius: R.full, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>`
- `106: <TouchableOpacity key={ch.id} onPress={() => setActiveChat(ch.id)}>`
### backend_consumers_or_contracts
- `7: import client from '../../api/client';`
### auth_ownership
- `42: sender: m.sender_id === user?.id ? (AR ? 'أنت' : 'You') : (m.sender_role || '—'),`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `16: const [activeChat, setActiveChat] = useState<string | null>(null);`
- `17: const [channels, setChannels] = useState<any[]>([]);`
- `18: const [messages, setMessages] = useState<any[]>([]);`
- `19: const [inputText, setInputText] = useState('');`
- `59: show(AR ? 'تعذر إرسال الرسالة' : 'Failed to send', 'error');`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll } from '../../components/ui';`
- `107: <NCard style={{ marginBottom: SP.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>`
- `120: </NCard>`
### error_empty_loading_retry_cancel
- `32: .catch(() => setChannels([]));`
- `48: .catch(() => setMessages([]));`
- `58: } catch (e) {`
- `59: show(AR ? 'تعذر إرسال الرسالة' : 'Failed to send', 'error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
