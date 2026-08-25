# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/FleetScreen.tsx`
- **Member SHA-256:** `312f31308df6804fe7ab90af6ff91c383cd23d9e848d9ba79f28872df3e490b8`
- **Line count:** 201
- **Read range:** `1-201`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: * FleetScreen — ambulance fleet management for BOTH dual-model owners:`
- `22: export function FleetScreen({ onBack }: { onBack: () => void }) {`
- `60: { text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' },`
- `63: onPress: async () => {`
- `91: <NBtn label={AR ? ' إضافة مركبة' : ' Add Vehicle'} icon="plus" onPress={() => setShowForm(true)} style={{ marginBottom: SP.lg }} />`
- `95: onCancel={() => setShowForm(false)}`
- `103: <NEmpty title={AR ? 'تعذر تحميل الأسطول' : 'Could not load fleet'} subtitle={AR ? 'تحقق من الاتصال وحاول مجدداً' : 'Check connection and retry'} />`
- `104: <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} variant="outline" full={false} onPress={load} />`
- `136: <NBtn label={AR ? 'حذف' : 'Remove'} variant="outline" size="sm" full={false} onPress={() => remove(v)} />`
- `146: function VehicleForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (v: any) => void }) {`
- `175: show(msg === 'plate_number_already_registered'`
- `176: ? (AR ? 'رقم اللوحة مسجّل مسبقاً' : 'Plate number already registered')`
### backend_consumers_or_contracts
- `9: import client from '../../api/client';`
### auth_ownership
- `2: * FleetScreen — ambulance fleet management for BOTH dual-model owners:`
- `4: * Every vehicle is created as `pending` and can only serve after admin approval;`
- `16: pending: { ar: 'بانتظار اعتماد الإدارة', en: 'Pending admin review', variant: 'warning' },`
- `79: <NHeader title={AR ? ' أسطول الإسعاف' : ' Ambulance Fleet'} sub={AR ? 'المركبات تخدم بعد اعتماد الإدارة' : 'Vehicles serve after admin approval'} onBack={onBack} />`
- `85: {AR ? 'كل مركبة جديدة أو معدّلة تُراجع من إدارة نبض قبل دخولها الخدمة واستلام مهام الطوارئ.' : 'Every new or edited vehicle is reviewed by Nabd admin before it can take emergency missions.'}`
- `127: {v.status === 'rejected' && !!v.admin_notes && (`
- `129: {(AR ? 'سبب الرفض: ' : 'Rejection reason: ') + v.admin_notes}`
- `171: show(AR ? 'أُضيفت المركبة — بانتظار اعتماد الإدارة' : 'Vehicle added — pending admin approval', 'success');`
### state_transitions
- `4: * Every vehicle is created as `pending` and can only serve after admin approval;`
- `5: * editing an approved vehicle sends it back to review.`
- `7: import React, { useCallback, useEffect, useState } from 'react';`
- `11: import { NBtn, NCard, NInput, NHeader, NScroll, NToggle, NBadge, NEmpty } from '../../components/ui';`
- `15: const STATUS_META: Record<string, { ar: string; en: string; variant: any }> = {`
- `16: pending: { ar: 'بانتظار اعتماد الإدارة', en: 'Pending admin review', variant: 'warning' },`
- `17: approved: { ar: 'معتمدة', en: 'Approved', variant: 'success' },`
- `18: rejected: { ar: 'مرفوضة', en: 'Rejected', variant: 'danger' },`
- `27: const [vehicles, setVehicles] = useState<any[]>([]);`
- `28: const [loading, setLoading] = useState(true);`
- `29: const [loadError, setLoadError] = useState(false);`
- `30: const [showForm, setShowForm] = useState(false);`
### payment_insurance_relevance
- `11: import { NBtn, NCard, NInput, NHeader, NScroll, NToggle, NBadge, NEmpty } from '../../components/ui';`
- `81: <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.lg }}>`
- `88: </NCard>`
- `114: <NCard key={v.id} style={{ marginBottom: SP.md }}>`
- `138: </NCard>`
- `184: <NCard style={{ marginBottom: SP.lg, borderWidth: 1, borderColor: theme.primary + '40' }}>`
- `199: </NCard>`
### error_empty_loading_retry_cancel
- `4: * Every vehicle is created as `pending` and can only serve after admin approval;`
- `11: import { NBtn, NCard, NInput, NHeader, NScroll, NToggle, NBadge, NEmpty } from '../../components/ui';`
- `16: pending: { ar: 'بانتظار اعتماد الإدارة', en: 'Pending admin review', variant: 'warning' },`
- `28: const [loading, setLoading] = useState(true);`
- `29: const [loadError, setLoadError] = useState(false);`
- `33: setLoading(true); setLoadError(false);`
- `37: } catch {`
- `38: setLoadError(true);`
- `40: setLoading(false);`
- `50: } catch {`
- `51: show(AR ? 'تعذر تحديث حالة المركبة' : 'Could not update vehicle', 'error');`
- `60: { text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
