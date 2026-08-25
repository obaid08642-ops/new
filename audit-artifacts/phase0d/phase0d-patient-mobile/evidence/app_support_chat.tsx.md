# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/support/chat.tsx`
- **Member SHA-256:** `7269f2404e7b47cb671a77bc064f8c3cc0b340d68e82796756690f8d1c8d3877`
- **Line count:** 398
- **Read range:** `1-398`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: import { router } from "expo-router";`
- `39: export default function SupportChatScreen() {`
- `129: <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `199: onPress={() => sendMessage(qr)}`
- `226: onPress={() => sendMessage(inputText)}`
- `245: onSubmitEditing={() => sendMessage(inputText)}`
- `250: onPress={async () => {`
- `259: if (result.canceled || !result.assets?.[0]) return;`
- `269: const up = await apiFetch<any>('/media/upload', { method: 'POST', body: formData });`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `253: const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();`
### state_transitions
- `3: import React, { useState, useRef } from "react";`
- `43: const [messages, setMessages] = useState<any[]>([]);`
- `44: const [inputText, setInputText] = useState("");`
- `45: const [isTyping, setIsTyping] = useState(false);`
- `46: const [attaching, setAttaching] = useState(false);`
- `100: throw new Error('No reply');`
- `122: <View style={styles.agentStatus}>`
- `259: if (result.canceled || !result.assets?.[0]) return;`
- `301: agentStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },`
### payment_insurance_relevance
- `22: Card,`
### error_empty_loading_retry_cancel
- `64: .catch(() => {});`
- `100: throw new Error('No reply');`
- `102: } catch {`
- `259: if (result.canceled || !result.assets?.[0]) return;`
- `272: } catch (err: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
