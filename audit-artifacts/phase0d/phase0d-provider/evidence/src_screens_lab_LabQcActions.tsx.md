# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/lab/LabQcActions.tsx`
- **Member SHA-256:** `3afeb4a1d19d5cd5b7b75fbb2c502a1872e9d0f7f3d2693c9cce6be86a1285f7`
- **Line count:** 158
- **Read range:** `1-158`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * for booking detail views. Backed by /provider/ops/lab/bookings/:id/qc/:action`
- `13: export function LabQcActions({ booking, onDone }: { booking: any; onDone: () => void }) {`
- `27: await client.post(`/provider/ops/lab/bookings/${booking.id}/qc/${action}`, body);`
- `37: const isStat = booking.priority === 'stat';`
- `38: const isUrgent = booking.priority === 'urgent';`
- `39: const verified = !!booking.verified_by;`
- `40: const doubleVerified = !!booking.double_verified_by;`
- `54: onPress={() => qc('mark_urgent')}`
- `60: onPress={() => qc('mark_stat')}`
- `65: onPress={() => setShowCrit(true)}`
- `75: onPress={() => qc('verify')}`
- `82: onPress={() => {`
### backend_consumers_or_contracts
- `3: * for booking detail views. Backed by /provider/ops/lab/bookings/:id/qc/:action`
- `11: import client from '../../api/client';`
- `27: await client.post(`/provider/ops/lab/bookings/${booking.id}/qc/${action}`, body);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: import React, { useState } from 'react';`
- `18: const [busy, setBusy] = useState<string | null>(null);`
- `19: const [critNote, setCritNote] = useState('');`
- `20: const [showCrit, setShowCrit] = useState(false);`
- `21: const [rejectReason, setRejectReason] = useState('');`
- `22: const [showReject, setShowReject] = useState(false);`
- `28: show(AR ? 'تم التنفيذ' : 'Done', 'success');`
- `31: show(e?.response?.data?.message || (AR ? 'فشل التنفيذ' : 'Failed'), 'error');`
- `53: loading={busy === 'mark_urgent'} disabled={isUrgent}`
- `59: loading={busy === 'mark_stat'} disabled={isStat}`
- `74: loading={busy === 'verify'} disabled={verified}`
- `80: loading={busy === 'double_verify'}`
### payment_insurance_relevance
- `9: import { NBtn, NCard, NBadge } from '../../components/ui';`
- `43: <NCard style={{ marginTop: SP.md }}>`
- `107: <View style={[s.modalCard, { backgroundColor: theme.bg }]}>`
- `132: <View style={[s.modalCard, { backgroundColor: theme.bg }]}>`
- `150: </NCard>`
- `156: modalCard: { borderRadius: R.lg, padding: SP.lg },`
### error_empty_loading_retry_cancel
- `30: } catch (e: any) {`
- `31: show(e?.response?.data?.message || (AR ? 'فشل التنفيذ' : 'Failed'), 'error');`
- `53: loading={busy === 'mark_urgent'} disabled={isUrgent}`
- `59: loading={busy === 'mark_stat'} disabled={isStat}`
- `74: loading={busy === 'verify'} disabled={verified}`
- `80: loading={busy === 'double_verify'}`
- `83: if (!verified) { show(AR ? 'التحقق الأول مطلوب قبل المزدوج' : 'First verification required before double', 'error'); return; }`
- `99: loading={busy === 'recollect_requested'}`
- `120: <NBtn label={AR ? 'إرسال الإبلاغ' : 'Send Alert'} variant="danger" loading={busy === 'critical_value'}`
- `121: onPress={async () => { if (!critNote.trim()) { show(AR ? 'اكتب القيمة الحرجة' : 'Enter the critical value', 'error'); return; } setShowCrit(false); qc('critical_value', { note: critNote.trim() }); setCritNote(''); }}`
- `123: <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setShowCrit(false)} style={{ flex: 1 }} />`
- `142: <NBtn label={AR ? 'تأكيد الرفض' : 'Confirm Reject'} variant="danger" loading={busy === 'sample_rejected'}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
