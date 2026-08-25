# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityUnifiedCalendarScreen.tsx`
- **Member SHA-256:** `725394aa34f8fa086355cf44f4e2defb5d0f37e922683604241e3d4f1830eca7`
- **Line count:** 58
- **Read range:** `1-58`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function FacilityUnifiedCalendarScreen({ onBack }: { onBack: () => void }) {`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `13: const [events, setEvents] = useState<any[]>([]);`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';`
- `34: <NCard key={ev.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: ev.type === 'surgery' ? theme.warn : ev.type === 'emergency' ? theme.danger : theme.primary }}>`
- `52: </NCard>`
### error_empty_loading_retry_cancel
- `18: .catch(() => setEvents([]));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
