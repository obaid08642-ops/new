# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/settings/security.tsx`
- **Member SHA-256:** `886b8c82d9cea839d7c83c36cd006f074735c86ada1d1a3d2cc29434fcc7edf1`
- **Line count:** 430
- **Read range:** `1-430`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `27: export default function SecuritySettingsScreen() {`
- `99: { text: 'إلغاء', style: 'cancel' },`
- `103: onPress: async () => {`
- `130: <TouchableOpacity onPress={() => router.back()}>`
- `199: onPress={() => setShowPassChange(!showPassChange)}`
- `258: onPress={handleChangePass}`
- `293: onPress={() => revokeSession(s)}`
### backend_consumers_or_contracts
- `53: apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ biometric: val }) }).catch(() => {});`
- `58: apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ two_factor: val }) }).catch(() => {});`
- `68: await apiFetch('/users/me/change-password', {`
- `106: await apiFetch(`/users/me/sessions/${s.id}`, { method: 'DELETE' });`
### auth_ownership
- `84: const [sessions, setSessions] = useState<any[]>([]);`
- `88: const loadSessions = () => {`
- `89: apiFetch<any[]>('/users/me/sessions')`
- `90: .then(res => setSessions(res || []))`
- `91: .catch(() => setSessions([]))`
- `95: React.useEffect(() => { loadSessions(); }, []);`
- `97: const revokeSession = (s: any) => {`
- `106: await apiFetch(`/users/me/sessions/${s.id}`, { method: 'DELETE' });`
- `107: setSessions(prev => prev.filter(x => x.id !== s.id));`
- `273: {/* Active Sessions */}`
- `283: ) : sessions.length === 0 ? (`
- `286: sessions.map((s, i) => (`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `31: const [biometric, setBiometric] = useState(true);`
- `32: const [twoFactor, setTwoFactor] = useState(false);`
- `33: const [showPassChange, setShowPassChange] = useState(false);`
- `34: const [currentPass, setCurrentPass] = useState("");`
- `35: const [newPass, setNewPass] = useState("");`
- `36: const [confirmPass, setConfirmPass] = useState("");`
- `37: const [isSaving, setIsSaving] = useState(false);`
- `84: const [sessions, setSessions] = useState<any[]>([]);`
- `85: const [loading, setLoading] = useState(true);`
- `86: const [revoking, setRevoking] = useState<string | null>(null);`
- `92: .finally(() => setLoading(false));`
### payment_insurance_relevance
- `19: Card,`
- `141: styles.card,`
- `193: styles.card,`
- `197: <View style={styles.cardHeader}>`
- `276: styles.card,`
- `343: card: {`
- `352: cardTitle: {`
- `358: cardHeader: {`
### error_empty_loading_retry_cancel
- `48: .catch(() => {});`
- `53: apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ biometric: val }) }).catch(() => {});`
- `58: apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ two_factor: val }) }).catch(() => {});`
- `77: } catch (e: any) {`
- `85: const [loading, setLoading] = useState(true);`
- `91: .catch(() => setSessions([]))`
- `92: .finally(() => setLoading(false));`
- `99: { text: 'إلغاء', style: 'cancel' },`
- `108: } catch (err: any) {`
- `281: {loading ? (`
- `297: { backgroundColor: colors.errorSurface, opacity: revoking === s.id ? 0.5 : 1 },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
