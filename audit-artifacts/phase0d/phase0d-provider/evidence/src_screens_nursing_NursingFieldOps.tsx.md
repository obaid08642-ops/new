# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/nursing/NursingFieldOps.tsx`
- **Member SHA-256:** `54e0b309678416542033816ef0a2b427bf23d96b30eeec2b13d03069c92d931a`
- **Line count:** 317
- **Read range:** `1-317`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `136: onPress={() => { Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order?.address || 'Riyadh')}`); }}`
- `143: <NBtn label={AR ? 'بدء التحرك' : 'Start Transit'} loading={loading} onPress={handleStartTransit} disabled={!checklistComplete} />`
- `150: onPress={handleArrive}`
- `158: <NBtn label={AR ? 'بدء تقديم الرعاية' : 'Start Care'} loading={loading} onPress={() => updateState('start-care')} />`
- `167: onPress={() => updateState('no-show')}`
- `230: <TouchableOpacity onPress={() => setSignature(true)} style={{ padding: SP.md }}>`
- `239: onPress={() => updateState('complete', { vitals, clinical_notes: clinicalNotes, recommendations, signature_base64: 'signed' })}`
- `254: : 'Use this ONLY if patient is found in a critical condition requiring hospital transfer. Visit will be aborted and patient fully refunded.'}`
- `266: onPress={() => updateState('emergency-abort', { reason: emergencyReason })}`
- `290: onPress={() => setActiveTab(t.key as any)}`
### backend_consumers_or_contracts
- `3: import client from '../../api/client';`
- `67: const res = await client.post(`/nursing/visits/${order.id}/${endpoint}`, payload);`
### auth_ownership
- `9: export function NursingFieldOps({ order, onBack, onRefresh }: { order: any, onBack: () => void, onRefresh: () => void }) {`
- `70: onRefresh();`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `15: const [loading, setLoading] = useState(false);`
- `16: const [activeTab, setActiveTab] = useState<'map' | 'vitals' | 'notes' | 'emergency'>('map');`
- `18: // Visit states`
- `19: const [currentState, setCurrentState] = useState(order?.state || 'CONFIRMED');`
- `20: const [distance, setDistance] = useState(order?.distance || 1.2); // distance in km`
- `23: const [checklist, setChecklist] = useState({ meds: false, supplies: false, reachable: false, location: false });`
- `26: // No-Show Timer`
- `27: const [noShowMinutesLeft, setNoShowMinutesLeft] = useState(10);`
- `30: const [vitals, setVitals] = useState({ bp: '', hr: '', rr: '', temp: '', spo2: '', blood_sugar: '', pain_scale: '' });`
- `33: const [clinicalNotes, setClinicalNotes] = useState('');`
- `34: const [recommendations, setRecommendations] = useState('');`
### payment_insurance_relevance
- `4: import { NHeader, NCard, NBtn, NScroll } from '../../components/ui';`
- `64: const updateState = async (endpoint: string, payload: any = {}) => {`
- `67: const res = await client.post(`/nursing/visits/${order.id}/${endpoint}`, payload);`
- `98: <NCard style={{ marginBottom: SP.lg }}>`
- `117: </NCard>`
- `124: <NCard style={{ marginBottom: SP.lg, padding: 0, overflow: 'hidden' }}>`
- `140: </NCard>`
- `159: <NCard style={{ backgroundColor: theme.danger + '20', borderColor: theme.danger }}>`
- `170: </NCard>`
- `175: <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>`
- `182: </NCard>`
- `218: <NCard style={{ alignItems: 'center', padding: SP.xl, borderStyle: 'dashed' }}>`
### error_empty_loading_retry_cancel
- `15: const [loading, setLoading] = useState(false);`
- `65: setLoading(true);`
- `74: } catch (err: any) {`
- `75: show(err.response?.data?.message || err.message, 'error');`
- `77: setLoading(false);`
- `83: show(AR ? 'يرجى إكمال القائمة المرجعية أولاً' : 'Please complete the pre-visit checklist', 'error');`
- `91: show(AR ? 'أنت بعيد عن الموقع (يجب أن تكون المسافة أقل من 500 متر)' : 'You are too far from the location (< 500m required)', 'error');`
- `143: <NBtn label={AR ? 'بدء التحرك' : 'Start Transit'} loading={loading} onPress={handleStartTransit} disabled={!checklistComplete} />`
- `149: loading={loading}`
- `158: <NBtn label={AR ? 'بدء تقديم الرعاية' : 'Start Care'} loading={loading} onPress={() => updateState('start-care')} />`
- `166: loading={loading}`
- `238: loading={loading}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
