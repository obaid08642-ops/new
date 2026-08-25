# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/ai-assistant.tsx`
- **Member SHA-256:** `d5ec29fd132bbd7fa3fe44103da767388ca4aa8819baf06cbfc7bf2ccdc64f5b`
- **Line count:** 210
- **Read range:** `1-210`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { Stack, useRouter } from 'expo-router';`
- `18: export default function AIAssistantScreen() {`
- `19: const router = useRouter();`
- `106: <Stack.Screen options={{ title: 'المساعد الطبي AI' }} />`
- `135: onPress={() => router.push('/ai/prescription-translator')}`
- `142: onSubmitEditing={sendMessage}`
- `150: onPress={sendMessage}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: role: 'user' | 'assistant';`
- `24: role: 'assistant',`
- `39: role: 'user',`
- `50: messages: messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),`
- `55: role: 'assistant',`
- `65: role: 'assistant',`
- `77: const isUser = item.role === 'user';`
### state_transitions
- `2: import React, { useState, useRef } from 'react';`
- `21: const [messages, setMessages] = useState<Message[]>([`
- `29: const [input, setInput] = useState('');`
- `30: const [loading, setLoading] = useState(false);`
- `32: const user = useAppSelector(state => state.auth.user);`
- `35: if (!input.trim() || loading) return;`
- `46: setLoading(true);`
- `61: } catch (error) {`
- `62: console.error(error);`
- `63: const errorMessage: Message = {`
- `69: setMessages(prev => [...prev, errorMessage]);`
- `71: setLoading(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `30: const [loading, setLoading] = useState(false);`
- `35: if (!input.trim() || loading) return;`
- `46: setLoading(true);`
- `61: } catch (error) {`
- `62: console.error(error);`
- `63: const errorMessage: Message = {`
- `69: setMessages(prev => [...prev, errorMessage]);`
- `71: setLoading(false);`
- `72: setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
