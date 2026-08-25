# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/ai/triage.tsx`
- **Member SHA-256:** `e4351c0c162ea0a8b5396a28726d0601b62a9ec51df304befe83f43251970fcf`
- **Line count:** 78
- **Read range:** `1-78`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `19: export default function GuidedTriageScreen() {`
- `25: const [submitting, setSubmitting] = useState(false);`
- `37: const submit = async () => {`
- `39: setSubmitting(true); setError(null);`
- `43: } catch { setError(t('triageError')); } finally { setSubmitting(false); }`
- `51: <View style={[styles.header, { backgroundColor: emergency ? '#991B1B' : '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={reset} style={styles.backButton}><Icon name="refresh" size={21} color="`
- `57: {emergency ? <TouchableOpacity accessibilityRole="button" onPress={callLocalEmergency} style={[styles.primaryAction, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('ca`
- `61: <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.outlineAction, { borderColor: colors.border }]}><AppText variant="h6" color={colors.textPrimary}>{t('startAgain')}</AppText></TouchableOpacity>`
- `67: <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={21} color="#FFFFFF" /></`
- `71: <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => { const active = flags.includes(option.value); return <TouchableOpacity `
- `73: <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryAction, { backgroundColor: '#312E81', opacity: submitting ? 0.65 : 1 }]}>{submitting ? <ActivityIndicator color="#FFFFFF"`
### backend_consumers_or_contracts
- `41: const data = await apiFetch('/ai/triage', { method: 'POST', body: JSON.stringify({ symptoms: symptoms.trim(), red_flags: flags.length ? flags : ['none'] }) });`
### auth_ownership
- `51: <View style={[styles.header, { backgroundColor: emergency ? '#991B1B' : '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={reset} style={styles.backButton}><Icon name="refresh" size={21} color="`
- `57: {emergency ? <TouchableOpacity accessibilityRole="button" onPress={callLocalEmergency} style={[styles.primaryAction, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('ca`
- `61: <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.outlineAction, { borderColor: colors.border }]}><AppText variant="h6" color={colors.textPrimary}>{t('startAgain')}</AppText></TouchableOpacity>`
- `67: <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={21} color="#FFFFFF" /></`
- `71: <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => { const active = flags.includes(option.value); return <TouchableOpacity `
- `73: <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryAction, { backgroundColor: '#312E81', opacity: submitting ? 0.65 : 1 }]}>{submitting ? <ActivityIndicator color="#FFFFFF"`
### state_transitions
- `1: import React, { useMemo, useState } from 'react';`
- `23: const [symptoms, setSymptoms] = useState('');`
- `24: const [flags, setFlags] = useState<string[]>([]);`
- `25: const [submitting, setSubmitting] = useState(false);`
- `26: const [error, setError] = useState<string | null>(null);`
- `27: const [result, setResult] = useState<TriageResult | null>(null);`
- `38: if (!symptoms.trim()) { setError(t('symptomsRequired')); return; }`
- `39: setSubmitting(true); setError(null);`
- `43: } catch { setError(t('triageError')); } finally { setSubmitting(false); }`
- `45: const reset = () => { setSymptoms(''); setFlags([]); setResult(null); setError(null); };`
- `71: <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => { const active = flags.includes(option.value); return <TouchableOpacity `
- `72: {error ? <AppText variant="caption" color="#B91C1C" style={styles.error}>{error}</AppText> : null}`
### payment_insurance_relevance
- `53: <View style={[styles.resultCard, { backgroundColor: emergency ? '#FEF2F2' : '#EEF2FF', borderColor: emergency ? '#FECACA' : '#C7D2FE' }]}>`
- `70: <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('symptoms')}</AppText><TextInput value={symptoms} onChangeText={setSymptoms} maxLength={1000} multiline textAlignVertical="`
- `71: <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => { const active = flags.includes(option.value); return <TouchableOpacity `
- `78: const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignIt`
### error_empty_loading_retry_cancel
- `26: const [error, setError] = useState<string | null>(null);`
- `38: if (!symptoms.trim()) { setError(t('symptomsRequired')); return; }`
- `39: setSubmitting(true); setError(null);`
- `43: } catch { setError(t('triageError')); } finally { setSubmitting(false); }`
- `45: const reset = () => { setSymptoms(''); setFlags([]); setResult(null); setError(null); };`
- `72: {error ? <AppText variant="caption" color="#B91C1C" style={styles.error}>{error}</AppText> : null}`
- `78: const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignIt`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
