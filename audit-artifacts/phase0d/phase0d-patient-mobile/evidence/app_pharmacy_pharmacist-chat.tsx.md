# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/pharmacist-chat.tsx`
- **Member SHA-256:** `d952395aa04b4bb1dc823815e98f40e8c2f08975c5aad49fb70dface12e3a6bb`
- **Line count:** 424
- **Read range:** `1-424`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: import { router } from "expo-router";`
- `23: export default function PharmacistChatScreen() {`
- `122: onPress={() => router.replace("/pharmacy/cart")}`
- `240: onPress={() =>`
- `242: ? router.push({ pathname: "/pharmacy/payment", params: { orderId: activeOrderId } })`
- `243: : router.push("/pharmacy/order-history")`
- `353: onSubmitEditing={send}`
- `360: onPress={send}`
### backend_consumers_or_contracts
- `17: import { useSocket } from "../../src/context/SocketContext";`
- `30: const { socket, isConnected } = useSocket() as any;`
- `41: const threadsRes = await apiFetch<any[]>('/pharmacy/chat/threads');`
- `46: const msgsRes = await apiFetch<any>(`/pharmacy/chat/threads/${threadId}/messages`);`
- `53: if (socket) {`
- `54: socket.on('pharmacy:message', (incomingMsg: any) => {`
- `57: socket.on('pharmacy:typing', (data: any) => {`
- `63: offlineQueue.forEach(msg => socket.emit('pharmacy:message:send', msg));`
- `68: if (socket) {`
- `69: socket.off('pharmacy:message');`
- `70: socket.off('pharmacy:typing');`
- `73: }, [socket, isConnected]);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `8: StatusBar,`
- `29: const [msg, setMsg] = useState("");`
- `31: const [messages, setMessages] = useState<any[]>([]);`
- `33: const [activeThreadId, setActiveThreadId] = useState<string | null>(null);`
- `34: const [activeOrderId, setActiveOrderId] = useState<string | null>(null);`
- `35: const [isTyping, setIsTyping] = useState(false);`
- `36: const [offlineQueue, setOfflineQueue] = useState<any[]>([]);`
- `49: } catch (e) { console.error(e); }`
- `77: const newMsg = { id: Date.now(), sender: "me", text: msg, time: "الآن", status: isConnected ? "sent" : "pending" };`
- `101: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `212: {m.type === "invoice" ? (`
- `237: styles.payBtn,`
- `242: ? router.push({ pathname: "/pharmacy/payment", params: { orderId: activeOrderId } })`
- `396: payBtn: {`
### error_empty_loading_retry_cancel
- `36: const [offlineQueue, setOfflineQueue] = useState<any[]>([]);`
- `49: } catch (e) { console.error(e); }`
- `61: // Flush offline queue when connected`
- `62: if (isConnected && offlineQueue.length > 0) {`
- `63: offlineQueue.forEach(msg => socket.emit('pharmacy:message:send', msg));`
- `64: setOfflineQueue([]);`
- `77: const newMsg = { id: Date.now(), sender: "me", text: msg, time: "الآن", status: isConnected ? "sent" : "pending" };`
- `83: setOfflineQueue(prev => [...prev, newMsg]);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
