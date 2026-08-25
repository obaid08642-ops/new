# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/DischargeSummaryScreen.tsx`
- **Member SHA-256:** `d3b426c588120d3178ecd2c88320498b7511c923ac65a0a08c8d6a0e61ca899c`
- **Line count:** 171
- **Read range:** `1-171`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function DischargeSummaryScreen({ onBack, admission }: { onBack: () => void; admission?: any }) {`
- `80: <TouchableOpacity key={a.id} onPress={() => setSelected(a)}>`
- `162: onPress={handleSave}`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `14: const [admissions, setAdmissions] = useState<any[]>([]);`
- `15: const [selected, setSelected] = useState<any>(admission || null);`
- `16: const [loading, setLoading] = useState(!admission);`
- `17: const [saving, setSaving] = useState(false);`
- `19: const [diagnosis, setDiagnosis] = useState('');`
- `20: const [medications, setMedications] = useState('');`
- `21: const [instructions, setInstructions] = useState('');`
- `28: setAdmissions(rows.filter((r: any) => r.status === 'active'));`
- `31: .finally(() => setLoading(false));`
- `50: show(AR ? 'تم حفظ ملخص الخروج وإخراج المريض' : 'Discharge summary saved and patient discharged', 'success');`
- `54: show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ ملخص الخروج' : 'Could not save discharge summary'), 'error');`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NScroll, NBtn, NBadge } from '../../components/ui';`
- `74: <NCard style={{ padding: SP.lg, alignItems: 'center' }}>`
- `78: </NCard>`
- `81: <NCard style={{ marginBottom: SP.sm }}>`
- `93: </NCard>`
- `99: <NCard style={{ marginBottom: SP.xl }}>`
- `110: </NCard>`
### error_empty_loading_retry_cancel
- `16: const [loading, setLoading] = useState(!admission);`
- `30: .catch(() => setAdmissions([]))`
- `31: .finally(() => setLoading(false));`
- `52: } catch (e: any) {`
- `54: show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ ملخص الخروج' : 'Could not save discharge summary'), 'error');`
- `66: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
