# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityPatientTrackerScreen.tsx`
- **Member SHA-256:** `c4e2a3ed2e91ac53d2f88b142c4af55a8b1448b80818ff09bfe159377bd0eebb`
- **Line count:** 79
- **Read range:** `1-79`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function FacilityPatientTrackerScreen({ onBack }: { onBack: () => void }) {`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `13: const [patients, setPatients] = useState<any[]>([]);`
- `34: <NCard key={patient.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: patient.status === 'critical' ? theme.danger : patient.status === 'observation' ? theme.warn : theme.success }}>`
- `45: label={patient.status === 'critical' ? (AR ? 'حرج' : 'Critical') : patient.status === 'observation' ? (AR ? 'تحت الملاحظة' : 'Observation') : (AR ? 'مستقر' : 'Stable')}`
- `46: variant={patient.status === 'critical' ? 'danger' : patient.status === 'observation' ? 'warning' : 'success'}`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';`
- `34: <NCard key={patient.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: patient.status === 'critical' ? theme.danger : patient.status === 'observation' ? theme.warn : theme.success }}>`
- `73: </NCard>`
### error_empty_loading_retry_cancel
- `18: .catch(() => setPatients([]));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
