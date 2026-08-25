# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/COMMUNICATIONS_SOURCE_TRACE_20260817.txt`
- **Member SHA-256:** `bf80baa70f467741b46b725ed10d57cdb53ba132440a69d79e3ee8a10239d78b`
- **Line count:** 1280
- **Read range:** `1-1280`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `57: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:142:            onSubmitEditing={sendMessage}`
- `58: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:150:            onPress={sendMessage}`
- `98: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:7:    "file": "settings/notifications-settings.tsx",`
- `99: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:11:    "file": "settings/support-chat.tsx",`
- `100: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:27:    "file": "settings/notifications.tsx",`
- `101: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:91:    "file": "pharmacy/chat-with-pharmacist.tsx",`
- `102: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:195:    "file": "health/family-chat.tsx",`
- `103: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:303:    "file": "family/chat.tsx",`
- `104: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:311:    "file": "family/voice-call.tsx",`
- `105: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:411:    "file": "support/chat.tsx",`
- `106: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:427:    "file": "ai/chat-doctor.tsx",`
- `107: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/rn_screens.json:463:    "file": "consultations/call-history.tsx",`
### backend_consumers_or_contracts
- `15: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/package.json:94:    "socket.io-client": "^4.8.3",`
- `16: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:2:import { io, Socket } from 'socket.io-client';`
- `17: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:7:import { getOfflineMessages, removeOfflineMessage } from '../utils/offlineQueue';`
- `18: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:52:      const offlineMsgs = await getOfflineMessages();`
- `19: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:57:          await apiFetch(`/chats/threads/${m.threadId}/messages`, {`
- `20: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:61:              message_type: m.messageType,`
- `21: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:65:          await removeOfflineMessage(m.id);`
- `22: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:67:          console.warn('Syncing offline message failed, halting queue processing', err);`
- `23: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:96:        transports: ['websocket'],`
- `24: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:105:        // Trigger offline message sync`
- `25: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:123:      socketInstance.on('chat:typing:start', ({ thread_id, user_id }) => {`
- `26: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:133:      socketInstance.on('chat:typing:stop', ({ thread_id, user_id }) => {`
### auth_ownership
- `34: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/ConsultationsContext.tsx:21:  const fetchAppointments = useCallback(async (isRefresh = false) => {`
- `48: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:50:        messages: messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),`
- `69: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app.json:57:        "android.permission.POST_NOTIFICATIONS",`
- `70: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app.json:59:        "android.permission.MANAGE_OWN_CALLS",`
- `90: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/AppContext.tsx:66:  const refreshConfig = useCallback(async () => {`
- `94: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/api.ts:43:// Auto guest provisioning: any call made without a valid token transparently`
- `95: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/api.ts:87:  // No token at all → provision a device-bound guest session (except auth calls).`
- `143: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/notifications.ts:24:    const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `144: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/notifications.ts:28:      const { status } = await Notifications.requestPermissionsAsync();`
- `145: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/notifications.ts:33:      console.log('Failed to get push token for push notification!');`
- `146: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/notifications.ts:43:        const nativeToken = await Notifications.getDevicePushTokenAsync();`
- `147: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/notifications.ts:62:        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });`
### state_transitions
- `2: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:19: *  - Throws Error with the server's message when available — no silent fake fallbacks.`
- `7: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:64:    return new Error(Array.isArray(serverMessage) ? serverMessage.join('، ') : String(serverMessage));`
- `8: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:70:  return new Error(err?.message || 'حدث خطأ غير متوقع');`
- `22: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:67:          console.warn('Syncing offline message failed, halting queue processing', err);`
- `33: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/ConsultationsContext.tsx:1:import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';`
- `35: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/CartContext.tsx:6:import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';`
- `37: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/CartContext.tsx:122:      // API call failed, ignore (guest fallback)`
- `43: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:21:  const [messages, setMessages] = useState<Message[]>([`
- `51: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:63:      const errorMessage: Message = {`
- `52: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:69:      setMessages(prev => [...prev, errorMessage]);`
- `62: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/DiagnosticsCartContext.tsx:1:import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';`
- `63: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/DiagnosticsCartContext.tsx:25:  addItem: (item: Omit<DiagnosticsCartItem, 'qty'> & { qty?: number }) => Promise<{ success: boolean; message?: string }>;`
### payment_insurance_relevance
- `192: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/sos.tsx:179:                  st.callCard,`
- `197: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/emergency/sos.tsx:284:  callCard: {`
- `229: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/insurance/approval-pending.tsx:105:          <Button label="اتصل بشركة التأمين" variant="outline" icon="call" onPress={() => router.replace('/(tabs)/consultations')} />`
- `453: /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/__tests__/ClinicalWorkflows.test.tsx:97:    const [url, payload] = mockPost.mock.calls[0] as unknown as [string, any];`
- `718: /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/constants/index.ts:354: dashboard:'الرئيسية', appointments:'المواعيد', chat:'الرسائل', wallet:'المحفظة', settings:'الإعدادات',`
- `720: /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/constants/index.ts:405: dashboard:'Home', appointments:'Schedule', chat:'Messages', wallet:'Wallet', settings:'Settings',`
- `786: /home/ubuntu/nabdah-live-extracted/provider-app/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx:651:                    {AR ? 'قم بتوجيه الكاميرا نحو الرف أو الفاتورة لاستخراج النواقص تلقائياً' : 'Point camera at shelf or invoice to`
- `850: /home/ubuntu/nabdah-gatekeeper-work/backend/nabdah-backend/src/common/idempotency.interceptor.spec.ts:39:    expect(redisClient.del).toHaveBeenCalledWith('idempotency:patient-a:POST:/moyasar/payments:same-client-key:lock');`
- `1132: /home/ubuntu/nabdah-gatekeeper-work/backend/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:53:    expect(emit).toHaveBeenCalledWith('moyasar.payment.paid', { id: 'pay_1' });`
- `1134: /home/ubuntu/nabdah-gatekeeper-work/backend/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:81:    expect(emit).toHaveBeenCalledWith('paytabs.payment.status', { tran_ref: 'T1' });`
- `1174: /home/ubuntu/nabdah-gatekeeper-work/backend/nabdah-backend/src/modules/auth/auth.service.ts:763:          email: payload.email || `${payload.username || 'snap_user'}@snapchat.com`,`
- `1175: /home/ubuntu/nabdah-gatekeeper-work/backend/nabdah-backend/src/modules/auth/auth.service.ts:764:          full_name: payload.name || 'Snapchat User',`
### error_empty_loading_retry_cancel
- `2: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:19: *  - Throws Error with the server's message when available — no silent fake fallbacks.`
- `7: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:64:    return new Error(Array.isArray(serverMessage) ? serverMessage.join('، ') : String(serverMessage));`
- `8: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/utils/api.ts:70:  return new Error(err?.message || 'حدث خطأ غير متوقع');`
- `17: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:7:import { getOfflineMessages, removeOfflineMessage } from '../utils/offlineQueue';`
- `18: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:52:      const offlineMsgs = await getOfflineMessages();`
- `21: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:65:          await removeOfflineMessage(m.id);`
- `22: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:67:          console.warn('Syncing offline message failed, halting queue processing', err);`
- `24: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/SocketContext.tsx:105:        // Trigger offline message sync`
- `37: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/context/CartContext.tsx:122:      // API call failed, ignore (guest fallback)`
- `51: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:63:      const errorMessage: Message = {`
- `52: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai-assistant.tsx:69:      setMessages(prev => [...prev, errorMessage]);`
- `75: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/utils/offlineQueue.ts:3:export interface OfflineMessage {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
