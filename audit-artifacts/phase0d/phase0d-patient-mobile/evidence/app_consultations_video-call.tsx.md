# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/video-call.tsx`
- **Member SHA-256:** `9be0057af1c131f2217ea22acec8e2159dd15e629d235901267389ba9fae8a3e`
- **Line count:** 250
- **Read range:** `1-250`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router, useLocalSearchParams } from "expo-router";`
- `21: // statically crashes the whole screen with Invariant Violation there, so we`
- `30: export default function VideoCallScreen() {`
- `158: router.replace({`
- `201: <TouchableOpacity style={styles.controlBtn} onPress={() => setMicOn(!micOn)}>`
- `207: <TouchableOpacity style={[styles.endBtn, { backgroundColor: resolveColor("var(--cr)") }]} onPress={handleEndCall}>`
- `211: <TouchableOpacity style={styles.controlBtn} onPress={() => setCamOn(!camOn)}>`
### backend_consumers_or_contracts
- `57: // (was calling non-existent /care/appointments/:id/video-token and falling back to a fake token)`
- `59: const initRes = await apiFetch(`/calls/initiate`, {`
- `66: const joinRes = await apiFetch(`/calls/${sessionId}/join`, { method: 'POST' });`
- `79: // LiveKit adapts each subscriber to the best layer their network can carry`
- `95: newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {`
- `101: newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {`
### auth_ownership
- `51: // Fetch appointment details and token`
- `53: let token = "";`
- `56: // M1-30: real LiveKit contract — POST /calls/initiate then /calls/:sessionId/join`
- `57: // (was calling non-existent /care/appointments/:id/video-token and falling back to a fake token)`
- `63: const session = initRes?.data || initRes;`
- `64: const sessionId = session?.session_id || session?.id;`
- `65: if (sessionId) {`
- `66: const joinRes = await apiFetch(`/calls/${sessionId}/join`, { method: 'POST' });`
- `68: token = resData?.token || resData?.livekit_token;`
- `70: setData(session?.appointment || session);`
- `74: if (!token) {`
- `118: await newRoom.connect(serverUrl, token);`
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `8: StatusBar,`
- `20: // @livekit/react-native is a NATIVE module — absent in Expo Go. Loading it`
- `35: const [loading, setLoading] = useState(true);`
- `36: const [data, setData] = useState<any>(null);`
- `37: const [micOn, setMicOn] = useState(true);`
- `38: const [camOn, setCamOn] = useState(true);`
- `40: // LiveKit States`
- `41: const [room, setRoom] = useState<Room | null>(null);`
- `42: const [remoteTrack, setRemoteTrack] = useState<any>(null);`
- `43: const [localTrack, setLocalTrack] = useState<any>(null);`
- `44: const [isConnected, setIsConnected] = useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: // @livekit/react-native is a NATIVE module — absent in Expo Go. Loading it`
- `26: } catch {`
- `35: const [loading, setLoading] = useState(true);`
- `75: throw new Error('تعذر بدء غرفة الفيديو — لم يصل رمز اتصال صالح من الخادم');`
- `123: setLoading(false);`
- `125: } catch (error) {`
- `126: console.log("Failed to connect to LiveKit", error);`
- `127: setLoading(false);`
- `164: if (loading)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
