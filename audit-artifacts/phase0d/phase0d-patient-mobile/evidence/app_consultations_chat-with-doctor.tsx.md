# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/chat-with-doctor.tsx`
- **Member SHA-256:** `6795062ac122a38d40b2386a2f24863db9ca8bbc3160afa01460e6f26573878f`
- **Line count:** 218
- **Read range:** `1-218`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router, useLocalSearchParams } from 'expo-router';`
- `9: import { router as expRouter, useLocalSearchParams as expSearchParams } from 'expo-router';`
- `16: export default function ChatWithDoctorScreen() {`
- `37: let cancelled = false;`
- `44: if (cancelled) return null;`
- `55: if (!tid || cancelled) return null;`
- `62: if (!out || cancelled) return;`
- `74: .catch(() => { if (!cancelled) { setDocData(null); setLoading(false); } });`
- `82: cancelled = true;`
- `143: <TouchableOpacity onPress={() => expRouter.back()} style={styles.iconBtn}>`
- `193: onSubmitEditing={send}`
- `195: <TouchableOpacity style={[styles.micBtn, { backgroundColor: resolveColor('var(--p)') }]} onPress={send}>`
### backend_consumers_or_contracts
- `10: import { useSocket } from '../../src/context/SocketContext';`
- `23: const { socket, onlineUsers, typingUsers, sendTyping, joinThread, leaveThread, isConnected } = useSocket();`
- `41: apiFetch(`/care/doctors/${doctorId}`)`
- `51: return apiFetch(`/chat/threads/direct`, { method: 'POST', body: JSON.stringify({ other_user_id: doctorUserId }) })`
- `58: return apiFetch(`/chat/threads/${tid}/messages`).then((mres: any) => ({ mres, doctorUserId }));`
- `88: if (!socket) return;`
- `102: socket.on('chat:message', handleNewMessage);`
- `104: socket.off('chat:message', handleNewMessage);`
- `106: }, [socket, threadId]);`
- `125: await apiFetch(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body: text, type: 'text', client_message_id: tempId }) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';`
- `28: const [loading, setLoading] = useState(true);`
- `29: const [docData, setDocData] = useState<any>(null);`
- `30: const [messages, setMessages] = useState<any[]>([]);`
- `31: const [msg, setMsg] = useState('');`
- `34: const [threadId, setThreadId] = useState('');`
- `37: let cancelled = false;`
- `44: if (cancelled) return null;`
- `46: setLoading(false);`
- `55: if (!tid || cancelled) return null;`
- `62: if (!out || cancelled) return;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `28: const [loading, setLoading] = useState(true);`
- `37: let cancelled = false;`
- `44: if (cancelled) return null;`
- `46: setLoading(false);`
- `55: if (!tid || cancelled) return null;`
- `62: if (!out || cancelled) return;`
- `74: .catch(() => { if (!cancelled) { setDocData(null); setLoading(false); } });`
- `78: setLoading(false);`
- `82: cancelled = true;`
- `121: const newMsg = { id: tempId, sender: 'me', text, time: new Date().toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }), pending: true };`
- `126: setMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false } : m));`
- `127: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
