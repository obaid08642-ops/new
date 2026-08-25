# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/chat.tsx`
- **Member SHA-256:** `1d7866e83313b504b2c3e7ecaedb058620d01c13eae206175752ebba8b7ea62f`
- **Line count:** 188
- **Read range:** `1-188`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from 'expo-router';`
- `22: export default function FamilyChatScreen() {`
- `74: // Poll for new messages while the screen is open`
- `135: <IconButton icon="back" onPress={() => router.back()} />`
- `146: <TouchableOpacity onPress={() => load(myId)} style={{ marginTop: 6 }}>`
- `170: <TouchableOpacity onPress={send} disabled={sending || !msg.trim()} style={[st.sendBtn, { backgroundColor: colors.primary, opacity: sending || !msg.trim() ? 0.5 : 1 } ]}>`
- `173: <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} />`
### backend_consumers_or_contracts
- `46: const res = await apiFetch('/family/chat/messages');`
- `62: const profile = await apiFetch('/users/me/profile');`
- `67: const mems = await apiFetch('/family/members');`
- `86: const res = await apiFetch('/family/chat/messages', {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useCallback, useEffect, useRef, useState } from 'react';`
- `4: import { View, StyleSheet, StatusBar, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';`
- `25: const [msg, setMsg] = useState('');`
- `26: const [messages, setMessages] = useState<Message[]>([]);`
- `27: const [myId, setMyId] = useState<string | null>(null);`
- `28: const [memberCount, setMemberCount] = useState<number | null>(null);`
- `29: const [loading, setLoading] = useState(true);`
- `30: const [loadError, setLoadError] = useState(false);`
- `31: const [sending, setSending] = useState(false);`
- `44: if (!silent) setLoading(true);`
- `49: setLoadError(false);`
- `51: console.error(err);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `29: const [loading, setLoading] = useState(true);`
- `30: const [loadError, setLoadError] = useState(false);`
- `44: if (!silent) setLoading(true);`
- `49: setLoadError(false);`
- `50: } catch (err: any) {`
- `51: console.error(err);`
- `52: if (!silent) setLoadError(true);`
- `54: setLoading(false);`
- `65: } catch {}`
- `69: } catch {}`
- `98: setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);`
- `99: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
