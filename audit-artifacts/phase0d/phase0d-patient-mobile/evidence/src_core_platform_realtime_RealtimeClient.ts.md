# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/realtime/RealtimeClient.ts`
- **Member SHA-256:** `921b7efdcba0ebe0b4a68f9f9782a879ee279be15c095fada2aedf0192763254`
- **Line count:** 112
- **Read range:** `1-112`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { io, Socket } from 'socket.io-client';`
- `6: export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';`
- `16: private status: SocketStatus = 'disconnected';`
- `17: private socket: Socket | null = null;`
- `21: * Initialize socket connection with Auth Token.`
- `24: if (this.status === 'connected' && this.socket?.connected) return;`
- `31: const cleanUrl = baseUrl.replace('/api/v1', '').replace('/api', '');`
- `33: this.socket = io(cleanUrl, {`
- `35: transports: ['websocket'],`
- `41: this.socket.on('connect', () => {`
- `43: this.log.info(`Realtime connected: ${this.socket?.id}`);`
- `46: this.socket.on('disconnect', (reason) => {`
### auth_ownership
- `21: * Initialize socket connection with Auth Token.`
- `23: public async connect(authToken?: string): Promise<void> {`
- `29: const token = authToken || (await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN));`
- `34: auth: { token },`
### state_transitions
- `6: export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';`
- `16: private status: SocketStatus = 'disconnected';`
- `24: if (this.status === 'connected' && this.socket?.connected) return;`
- `26: this.status = 'connecting';`
- `42: this.status = 'connected';`
- `47: this.status = 'disconnected';`
- `51: this.socket.on('connect_error', (err) => {`
- `52: this.status = 'disconnected';`
- `53: this.log.warn(`Realtime connection error: ${err.message}`);`
- `62: this.status = 'disconnected';`
- `107: * Update user presence status (Online/Offline/Typing)`
- `109: public setPresence(userId: string, state: 'online' | 'offline' | 'typing', topic?: string): void {`
### payment_insurance_relevance
- `10: payload: any;`
- `98: public publish(topic: string, payload: any): void {`
- `103: this.socket.emit(topic, payload);`
### error_empty_loading_retry_cancel
- `51: this.socket.on('connect_error', (err) => {`
- `53: this.log.warn(`Realtime connection error: ${err.message}`);`
- `107: * Update user presence status (Online/Offline/Typing)`
- `109: public setPresence(userId: string, state: 'online' | 'offline' | 'typing', topic?: string): void {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
