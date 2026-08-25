# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/DoctorOpsScreens.tsx`
- **Member SHA-256:** `c3ef6c3722aa3d589011fef38a717a6fdc2d0d31edf5d3376811479588e76ca1`
- **Line count:** 334
- **Read range:** `1-334`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: * Doctor Operations Screens — Phase-1 API integrations:`
- `18: export function DoctorLeavesScreen({ onBack }: { onBack: () => void }) {`
- `52: show(AR ? 'أُضيفت الإجازة — لن يستطيع المرضى الحجز فيها' : 'Leave added — patients cannot book during it', 'success');`
- `60: const cancel = async (id: string) => {`
- `63: show(AR ? 'أُلغيت الإجازة' : 'Leave cancelled', 'success');`
- `65: } catch { show(AR ? 'فشل الإلغاء' : 'Cancel failed', 'error'); }`
- `74: {AR ? 'أي حجز داخل فترة الإجازة يُمنع تلقائياً. صيغة التاريخ: YYYY-MM-DD' : 'Bookings inside leave periods are blocked automatically. Date format: YYYY-MM-DD'}`
- `81: <TouchableOpacity key={t.k} onPress={() => setType(t.k)}`
- `92: <NBtn label={AR ? 'إضافة الإجازة' : 'Add Leave'} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />`
- `108: <TouchableOpacity onPress={() => cancel(l.id)}>`
- `109: <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{AR ? 'إلغاء' : 'Cancel'}</Text>`
- `120: export function PrescriptionTemplatesScreen({ onBack }: { onBack: () => void }) {`
### backend_consumers_or_contracts
- `15: import client from '../../api/client';`
### auth_ownership
- `9: ActivityIndicator, RefreshControl, ScrollView, Alert,`
- `287: const unblock = async (patientId: string) => {`
- `289: await client.delete(`/provider/ops/doctor/blacklist/${patientId}`);`
### state_transitions
- `6: import React, { useState, useEffect, useCallback } from 'react';`
- `13: import { NBtn, NCard, NBadge, NHeader, NScroll, NInput, NSecHeader, NEmpty } from '../../components/ui';`
- `24: const [leaves, setLeaves] = useState<any[]>([]);`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [start, setStart] = useState('');`
- `27: const [end, setEnd] = useState('');`
- `28: const [type, setType] = useState('vacation');`
- `29: const [note, setNote] = useState('');`
- `30: const [saving, setSaving] = useState(false);`
- `43: } catch { setLeaves([]); } finally { setLoading(false); }`
- `48: if (!start || !end) { show(AR ? 'حدد تاريخ البداية والنهاية' : 'Set start and end dates', 'error'); return; }`
- `52: show(AR ? 'أُضيفت الإجازة — لن يستطيع المرضى الحجز فيها' : 'Leave added — patients cannot book during it', 'success');`
### payment_insurance_relevance
- `13: import { NBtn, NCard, NBadge, NHeader, NScroll, NInput, NSecHeader, NEmpty } from '../../components/ui';`
- `72: <NCard style={{ marginBottom: SP.lg }}>`
- `76: </NCard>`
- `98: <NCard key={l.id} style={{ marginBottom: SP.sm }}>`
- `112: </NCard>`
- `181: <NCard key={t.id} style={{ marginBottom: SP.sm }}>`
- `194: </NCard>`
- `253: <NCard key={d.id} style={{ marginBottom: SP.sm, marginTop: SP.xs }}>`
- `262: </NCard>`
- `299: <NCard style={{ marginBottom: SP.lg }}>`
- `305: </NCard>`
- `311: <NCard key={b.patient_id} style={{ marginBottom: SP.sm }}>`
### error_empty_loading_retry_cancel
- `13: import { NBtn, NCard, NBadge, NHeader, NScroll, NInput, NSecHeader, NEmpty } from '../../components/ui';`
- `25: const [loading, setLoading] = useState(true);`
- `43: } catch { setLeaves([]); } finally { setLoading(false); }`
- `48: if (!start || !end) { show(AR ? 'حدد تاريخ البداية والنهاية' : 'Set start and end dates', 'error'); return; }`
- `55: } catch (e: any) {`
- `56: show(e?.response?.data?.message || (AR ? 'فشل الإضافة' : 'Failed to add'), 'error');`
- `60: const cancel = async (id: string) => {`
- `63: show(AR ? 'أُلغيت الإجازة' : 'Leave cancelled', 'success');`
- `65: } catch { show(AR ? 'فشل الإلغاء' : 'Cancel failed', 'error'); }`
- `92: <NBtn label={AR ? 'إضافة الإجازة' : 'Add Leave'} onPress={add} loading={saving} style={{ marginTop: SP.sm, marginBottom: SP.xl }} />`
- `95: {loading && <ActivityIndicator color={theme.primary} />}`
- `96: {!loading && leaves.length === 0 && <NEmpty title={AR ? 'لا إجازات مسجلة' : 'No leaves'} subtitle={AR ? 'إجازاتك القادمة تظهر هنا' : 'Your upcoming leaves appear here'} />}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
