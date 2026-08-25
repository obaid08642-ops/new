# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/ai/skin-analysis.tsx`
- **Member SHA-256:** `98b4e44c02fd836bc823693531b2e362f6ed8747975379994880f810c15df966`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `15: export default function SkinSelfCheckScreen() {`
- `23: const [submitting, setSubmitting] = useState(false);`
- `33: const submit = async () => {`
- `35: setSubmitting(true); setError(null);`
- `39: } catch { setError(t('skinError')); } finally { setSubmitting(false); }`
- `45: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: clinical ? '#9A3412' : '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={reset} style={style`
- `48: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={() => router.back()} style={styles.backBut`
### backend_consumers_or_contracts
- `37: const data = await apiFetch('/ai/skin-analysis', { method: 'POST', body: JSON.stringify({ acknowledge_limitations: true, areas, observations: observations.length ? observations : ['none'], ...(note.trim() ? { note: note.trim() } : {}) }) })`
### auth_ownership
- `45: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: clinical ? '#9A3412' : '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={reset} style={style`
- `48: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={() => router.back()} style={styles.backBut`
### state_transitions
- `1: import React, { useState } from 'react';`
- `19: const [areas, setAreas] = useState<string[]>([]);`
- `20: const [observations, setObservations] = useState<string[]>([]);`
- `21: const [note, setNote] = useState('');`
- `22: const [acknowledged, setAcknowledged] = useState(false);`
- `23: const [submitting, setSubmitting] = useState(false);`
- `24: const [error, setError] = useState<string | null>(null);`
- `25: const [result, setResult] = useState<SkinResult | null>(null);`
- `34: if (!areas.length || !acknowledged) { setError(t('skinError')); return; }`
- `35: setSubmitting(true); setError(null);`
- `39: } catch { setError(t('skinError')); } finally { setSubmitting(false); }`
- `41: const reset = () => { setAreas([]); setObservations([]); setNote(''); setAcknowledged(false); setError(null); setResult(null); };`
### payment_insurance_relevance
- `48: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={() => router.back()} style={styles.backBut`
- `51: const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignIt`
### error_empty_loading_retry_cancel
- `24: const [error, setError] = useState<string | null>(null);`
- `34: if (!areas.length || !acknowledged) { setError(t('skinError')); return; }`
- `35: setSubmitting(true); setError(null);`
- `39: } catch { setError(t('skinError')); } finally { setSubmitting(false); }`
- `41: const reset = () => { setAreas([]); setObservations([]); setNote(''); setAcknowledged(false); setError(null); setResult(null); };`
- `48: return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={() => router.back()} style={styles.backBut`
- `51: const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignIt`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
