# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityAuditLogScreen.tsx`
- **Member SHA-256:** `f4835e692c52ca8903496085615b4aac82b89aea9666e04f1077edd8e1f15c53`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function FacilityAuditLogScreen({ onBack }: { onBack: () => void }) {`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState } from 'react';`
- `13: const [auditLogs, setAuditLogs] = useState<any[]>([]);`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll, NBadge } from '../../components/ui';`
- `34: <NCard key={log.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: log.severity === 'danger' ? theme.danger : log.severity === 'warning' ? theme.warn : theme.primary }}>`
- `53: </NCard>`
### error_empty_loading_retry_cancel
- `18: .catch(() => setAuditLogs([]));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
