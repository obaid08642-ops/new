# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/livekit-view.tsx`
- **Member SHA-256:** `2d7d42ccbb7f55af991f4ce834f181ca9b30787487e70d845d359b339d470acc`
- **Line count:** 197
- **Read range:** `1-197`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `26: onPress: () => void;`
- `99: console.warn('Failed to route audio', e);`
- `146: onPress={toggleMic}`
- `153: onPress={toggleCamera}`
- `160: onPress={toggleSpeaker}`
- `163: <TouchableOpacity onPress={onEndCall} style={st.endBtn}>`
### backend_consumers_or_contracts
- `33: if (cameraPublication && cameraPublication.isSubscribed && !cameraPublication.isMuted) {`
### auth_ownership
- `11: AudioSession,`
- `18: token: string;`
- `95: await AudioSession.configureAudio({`
- `174: token,`
- `184: token={token}`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `61: const [callDuration, setCallDuration] = useState(0);`
- `62: const [isMuted, setIsMuted] = useState(false);`
- `63: const [isCameraOff, setIsCameraOff] = useState(isVoiceOnly);`
- `64: const [isSpeaker, setIsSpeaker] = useState(false);`
- `99: console.warn('Failed to route audio', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `98: } catch (e) {`
- `99: console.warn('Failed to route audio', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
