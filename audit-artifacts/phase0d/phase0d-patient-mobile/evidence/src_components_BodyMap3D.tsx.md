# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/BodyMap3D.tsx`
- **Member SHA-256:** `96c09d84e4ebf976c29d3b82e681c960a26080befcc3f8b5cf38cbc2ec0e2f04`
- **Line count:** 230
- **Read range:** `1-230`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: import React, { useMemo, useRef, useState } from "react";`
- `87: const [yaw, setYaw] = useState(-0.22);`
- `88: const [pitch, setPitch] = useState(0.06);`
- `89: const stateRef = useRef({ yaw: -0.22, pitch: 0.06, dragging: false, wasTap: false });`
- `99: onPanResponderGrant: () => { stateRef.current.dragging = false; },`
- `101: if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) stateRef.current.dragging = true;`
- `102: const nextYaw = stateRef.current.yaw + g.dx * 0.012;`
- `103: const nextPitch = Math.max(-0.5, Math.min(0.55, stateRef.current.pitch + g.dy * 0.006));`
- `108: stateRef.current.yaw += g.dx * 0.012;`
- `109: stateRef.current.pitch = Math.max(-0.5, Math.min(0.55, stateRef.current.pitch + g.dy * 0.006));`
- `111: if (!stateRef.current.dragging || (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8)) {`
- `112: stateRef.current.wasTap = true;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
