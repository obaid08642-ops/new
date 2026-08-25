# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityProfileConfigScreen.tsx`
- **Member SHA-256:** `ca2f44fbe4b882edcb7065499fa321b9ec31b34e85e8549fadfc2a5de7662e73`
- **Line count:** 120
- **Read range:** `1-120`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export function FacilityProfileConfigScreen({ onBack }: { onBack: () => void }) {`
- `99: onPress={() => toggleSpec(sp.id)}`
- `117: <NBtn label={AR ? 'حفظ التحديثات' : 'Save Updates'} onPress={handleSave} loading={saving} style={{ marginBottom: SP.xl }} />`
### backend_consumers_or_contracts
- `6: import client from '../../api/client';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `14: const [facilityName, setFacilityName] = useState('');`
- `15: const [descAr, setDescAr] = useState('');`
- `16: const [descEn, setDescEn] = useState('');`
- `17: const [website, setWebsite] = useState('');`
- `18: const [whatsapp, setWhatsapp] = useState('');`
- `19: const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);`
- `20: const [saving, setSaving] = useState(false);`
- `21: const [loading, setLoading] = useState(true);`
- `35: show(AR ? 'تعذر تحميل ملف المنشأة' : 'Could not load facility profile', 'error');`
- `36: } finally { setLoading(false); }`
- `50: show(AR ? 'تم حفظ ملف المنشأة بنجاح' : 'Facility profile saved successfully', 'success');`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NInput, NBtn, NSecHeader, NBadge, NScroll } from '../../components/ui';`
- `75: <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xl }}>`
- `80: </NCard>`
- `92: <NCard style={{ marginBottom: SP.xl }}>`
- `115: </NCard>`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = useState(true);`
- `34: } catch {`
- `35: show(AR ? 'تعذر تحميل ملف المنشأة' : 'Could not load facility profile', 'error');`
- `36: } finally { setLoading(false); }`
- `52: } catch (err: any) {`
- `53: show(err?.response?.data?.message || (AR ? 'فشل حفظ الملف' : 'Failed to save profile'), 'error');`
- `61: if (loading) {`
- `117: <NBtn label={AR ? 'حفظ التحديثات' : 'Save Updates'} onPress={handleSave} loading={saving} style={{ marginBottom: SP.xl }} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
