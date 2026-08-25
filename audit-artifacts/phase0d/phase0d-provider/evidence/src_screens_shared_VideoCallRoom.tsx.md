# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/VideoCallRoom.tsx`
- **Member SHA-256:** `4b8518590d971c3fb3a18a77fa5de23d12084d55e7f8edd97d235b5a6a4e6ad6`
- **Line count:** 252
- **Read range:** `1-252`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: * honest error with retry — never a fake video feed.`
- `19: let registerGlobals: any = () => {};`
- `25: registerGlobals = lk.registerGlobals;`
- `36: let globalsRegistered = false;`
- `38: if (!globalsRegistered) {`
- `39: try { registerGlobals(); } catch { /* already registered */ }`
- `40: globalsRegistered = true;`
- `183: {AR ? 'تعذر الاتصال بالغرفة — تحقق من الشبكة ثم أعد المحاولة' : 'Could not join the room — check your network and retry'}`
- `187: <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={connect} />`
- `189: <TouchableOpacity onPress={onEnd} style={{ marginTop: SP.md }}>`
- `224: <TouchableOpacity style={st.ctrl} onPress={() => setMicOn(v => !v)} accessibilityLabel={AR ? 'كتم الصوت' : 'Mute'}>`
- `228: <TouchableOpacity style={st.ctrl} onPress={() => setCamOn(v => !v)} accessibilityLabel={AR ? 'الكاميرا' : 'Camera'}>`
### backend_consumers_or_contracts
- `30: import client from '../../api/client';`
- `109: room.on(RoomEvent.TrackSubscribed, (track: Track) => {`
- `112: room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {`
### auth_ownership
- `5: *   1. POST /calls/initiate { appointmentId, call_type: 'video' } → { session_id | id }`
- `6: *   2. POST /calls/:sessionId/join → { token, room_name }`
- `8: *   4. POST /calls/:sessionId/end on hang-up`
- `18: let AudioSession: any = { startAudioSession: async () => {}, stopAudioSession: () => {} };`
- `24: AudioSession = lk.AudioSession;`
- `45: /** Appointment id used to initiate/join the call session. */`
- `51: /** Called after the room disconnects and the backend session is ended. */`
- `69: const sessionRef = useRef<string | null>(null);`
- `86: const session = initRes.data || {};`
- `87: const sessionId = session.session_id || session.id;`
- `88: if (!sessionId) throw new Error('no_session');`
- `89: sessionRef.current = sessionId;`
### state_transitions
- `10: * honest error with retry — never a fake video feed.`
- `12: import React, { useEffect, useRef, useState } from 'react';`
- `16: // the bundle loads fine there; video UI is hidden and an honest error is shown.`
- `60: const [phase, setPhase] = useState<'connecting' | 'connected' | 'error'>('connecting');`
- `61: const [errMsg, setErrMsg] = useState('');`
- `62: const [remoteTrack, setRemoteTrack] = useState<Track | null>(null);`
- `63: const [localTrack, setLocalTrack] = useState<Track | null>(null);`
- `64: const [micOn, setMicOn] = useState(true);`
- `65: const [camOn, setCamOn] = useState(!voiceOnly);`
- `66: const [ending, setEnding] = useState(false);`
- `74: setPhase('error');`
- `88: if (!sessionId) throw new Error('no_session');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: * No fake "connected" UI: while connecting shows a spinner, on failure an`
- `10: * honest error with retry — never a fake video feed.`
- `16: // the bundle loads fine there; video UI is hidden and an honest error is shown.`
- `27: } catch {`
- `39: try { registerGlobals(); } catch { /* already registered */ }`
- `60: const [phase, setPhase] = useState<'connecting' | 'connected' | 'error'>('connecting');`
- `74: setPhase('error');`
- `88: if (!sessionId) throw new Error('no_session');`
- `93: if (!token) throw new Error('no_token');`
- `124: try { await AudioSession.startAudioSession(); } catch { /* best-effort on Android/iOS */ }`
- `134: } catch (e: any) {`
- `136: setErrMsg(e?.response?.data?.message || e?.message || 'connect_failed');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
