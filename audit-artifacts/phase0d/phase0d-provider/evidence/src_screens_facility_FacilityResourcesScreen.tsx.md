# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityResourcesScreen.tsx`
- **Member SHA-256:** `0b3239a7b6336724d9f1f9d5ecaa52d1984dc8dbe075797ad0df4f893a088bd2`
- **Line count:** 150
- **Read range:** `1-150`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: export function FacilityResourcesScreen({ onBack }: { onBack: () => void }) {`
- `76: <TouchableOpacity key={f.id} onPress={() => setFilterType(f.id)}`
- `92: <NSecHeader title={AR ? 'الموارد المسجلة' : 'Registered Resources'} />`
- `93: <TouchableOpacity style={{ padding: SP.xs }} onPress={() => setShowAdd(v => !v)}>`
- `94: <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{showAdd ? (AR ? 'إلغاء' : 'Cancel') : (AR ? '+ إضافة مورد' : '+ Add Resource')}</Text>`
- `104: <TouchableOpacity key={t.id} onPress={() => setAddType(t.id)}`
- `110: <NBtn label={AR ? 'حفظ المورد' : 'Save Resource'} loading={saving} onPress={handleAdd} />`
- `117: <NEmpty title={AR ? 'لا توجد موارد مسجلة' : 'No resources registered'} subtitle={AR ? 'أضف غرف العمليات والعيادات والأجهزة لإدارتها' : 'Add ORs, clinics and equipment to manage them'} />`
- `138: <TouchableOpacity disabled={busyId === res.id} onPress={() => toggleStatus(res)}>`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState, useEffect, useCallback } from 'react';`
- `4: import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge, NInput, NEmpty } from '../../components/ui';`
- `21: const [resources, setResources] = useState<any[]>([]);`
- `22: const [loading, setLoading] = useState(true);`
- `23: const [filterType, setFilterType] = useState<string>('all');`
- `24: const [showAdd, setShowAdd] = useState(false);`
- `25: const [nameAr, setNameAr] = useState('');`
- `26: const [nameEn, setNameEn] = useState('');`
- `27: const [addType, setAddType] = useState('consultation');`
- `28: const [saving, setSaving] = useState(false);`
- `29: const [busyId, setBusyId] = useState<string | null>(null);`
- `35: } catch { setResources([]); } finally { setLoading(false); }`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge, NInput, NEmpty } from '../../components/ui';`
- `99: <NCard style={{ marginBottom: SP.lg }}>`
- `111: </NCard>`
- `119: <NCard key={res.id} style={{ marginBottom: SP.md }}>`
- `144: </NCard>`
### error_empty_loading_retry_cancel
- `4: import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge, NInput, NEmpty } from '../../components/ui';`
- `22: const [loading, setLoading] = useState(true);`
- `35: } catch { setResources([]); } finally { setLoading(false); }`
- `42: show(AR ? 'أدخل اسم المورد' : 'Enter resource name', 'error');`
- `51: } catch (err: any) {`
- `52: show(err?.response?.data?.message || (AR ? 'فشل إضافة المورد' : 'Failed to add resource'), 'error');`
- `62: } catch (err: any) {`
- `63: show(err?.response?.data?.message || (AR ? 'فشل تحديث الحالة' : 'Status update failed'), 'error');`
- `94: <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{showAdd ? (AR ? 'إلغاء' : 'Cancel') : (AR ? '+ إضافة مورد' : '+ Add Resource')}</Text>`
- `110: <NBtn label={AR ? 'حفظ المورد' : 'Save Resource'} loading={saving} onPress={handleAdd} />`
- `114: {loading ? (`
- `117: <NEmpty title={AR ? 'لا توجد موارد مسجلة' : 'No resources registered'} subtitle={AR ? 'أضف غرف العمليات والعيادات والأجهزة لإدارتها' : 'Add ORs, clinics and equipment to manage them'} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
