# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/PharmacyChatResponder.tsx`
- **Member SHA-256:** `d7cd494ff03b93f67db0a310c09c508a074e899ebd6ee56ab670530ff8d98777`
- **Line count:** 102
- **Read range:** `1-102`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export const PharmacyChatResponder = ({ route, navigation }: any) => {`
- `9: const { threadId, patientName } = route.params;`
- `55: <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{color: theme.primary, fontSize: 18}}>رجوع</Text></TouchableOpacity>`
- `72: <TouchableOpacity onPress={sendInvoice} style={[styles.iconBtn, { backgroundColor: theme.orange }]}>`
- `81: onSubmitEditing={send}`
- `83: <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: theme.primary }]}>`
### backend_consumers_or_contracts
- `6: import { io, Socket } from 'socket.io-client';`
- `13: const [socket, setSocket] = useState<Socket | null>(null);`
- `16: // Connect Socket.IO`
- `17: const newSocket = io(process.env.EXPO_PUBLIC_BACKEND_URL || API_BASE.replace('/api/v1', ''), {`
- `18: transports: ['websocket'],`
- `20: setSocket(newSocket);`
- `23: apiFetch(`/pharmacy/chat/threads/${threadId}/messages`).then(res => {`
- `27: newSocket.on('pharmacy:message', (incomingMsg: any) => {`
- `32: newSocket.disconnect();`
- `40: if (socket) {`
- `41: socket.emit('pharmacy:message:send', newMsg);`
- `49: if (socket) socket.emit('pharmacy:message:send', invoiceMsg);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from 'react';`
- `11: const [messages, setMessages] = useState<any[]>([]);`
- `12: const [msg, setMsg] = useState('');`
- `13: const [socket, setSocket] = useState<Socket | null>(null);`
### payment_insurance_relevance
- `46: const sendInvoice = () => {`
- `47: const invoiceMsg = { id: Date.now(), sender: 'pharm', type: 'invoice', text: 'تم إنشاء الفاتورة', time: 'الآن' };`
- `48: setMessages(prev => [...prev, invoiceMsg]);`
- `49: if (socket) socket.emit('pharmacy:message:send', invoiceMsg);`
- `65: {item.type === 'invoice' && <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 5 }}>فاتورة مرسلة للعميل 🧾</Text>}`
- `72: <TouchableOpacity onPress={sendInvoice} style={[styles.iconBtn, { backgroundColor: theme.orange }]}>`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
