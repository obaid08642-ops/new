# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/context/SocketContext.tsx`
- **Member SHA-256:** `2853fe908eafc79610af4ee3607e8ad0f75987c8ac63d553e9cd4942955248b3`
- **Line count:** 215
- **Read range:** `1-215`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `143: // Dispatching a custom event that the root layout or an active screen can catch`
- `144: // because router.push inside this pure context can sometimes miss the navigation tree`
### backend_consumers_or_contracts
- `2: import { io, Socket } from 'socket.io-client';`
- `11: const rawSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002';`
- `12: const getCleanSocketUrl = (url: string) => {`
- `27: const SOCKET_URL = getCleanSocketUrl(rawSocketUrl);`
- `29: interface SocketContextValue {`
- `30: socket: Socket | null;`
- `40: const SocketContext = createContext<SocketContextValue | undefined>(undefined);`
- `42: export function SocketProvider({ children }: { children: React.ReactNode }) {`
- `43: const [socket, setSocket] = useState<Socket | null>(null);`
- `57: await apiFetch(`/chats/threads/${m.threadId}/messages`, {`
- `78: let socketInstance: Socket | null = null;`
- `80: const initSocket = async () => {`
### auth_ownership
- `81: let token: string | null = null;`
- `83: token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);`
- `86: token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);`
- `90: if (!token) {`
- `95: auth: { token },`
### state_transitions
- `1: import React, { createContext, useContext, useEffect, useState, useRef } from 'react';`
- `43: const [socket, setSocket] = useState<Socket | null>(null);`
- `44: const [isConnected, setIsConnected] = useState(false);`
- `45: const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});`
- `46: const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});`
- `67: console.warn('Syncing offline message failed, halting queue processing', err);`
- `72: console.error('Error in syncOfflineQueue', err);`
- `212: throw new Error('useSocket must be used within a SocketProvider');`
### payment_insurance_relevance
- `141: socketInstance.on('copay_required', (payload) => {`
- `142: console.log('[Socket] Copay Required Alert received:', payload);`
- `148: DeviceEventEmitter.emit('onCopayRequired', payload);`
### error_empty_loading_retry_cancel
- `7: import { getOfflineMessages, removeOfflineMessage } from '../utils/offlineQueue';`
- `37: syncOfflineQueue: () => Promise<void>;`
- `48: const typingTimeoutRef = useRef<Record<string, any>>({});`
- `50: const syncOfflineQueue = async () => {`
- `52: const offlineMsgs = await getOfflineMessages();`
- `53: if (offlineMsgs.length === 0) return;`
- `55: for (const m of offlineMsgs) {`
- `65: await removeOfflineMessage(m.id);`
- `66: } catch (err) {`
- `67: console.warn('Syncing offline message failed, halting queue processing', err);`
- `71: } catch (err) {`
- `72: console.error('Error in syncOfflineQueue', err);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
