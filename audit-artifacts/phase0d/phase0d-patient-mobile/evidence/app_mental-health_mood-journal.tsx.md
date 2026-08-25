# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/mental-health/mood-journal.tsx`
- **Member SHA-256:** `1844cf68b1c3bf6623e58db2d9e5d0dccadb11a039353a432d75ab19306bd784`
- **Line count:** 133
- **Read range:** `1-133`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `26: export default function MoodJournalScreen() {`
- `63: const submit = async () => {`
- `83: {[1, 2, 3, 4, 5].map((number) => <TouchableOpacity key={number} accessibilityRole="button" onPress={() => onChange(number)} style={[styles.scaleDot, { borderColor: selectedMoodColor }, value === number && { backgroundColor: selectedMoodColo`
- `91: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`
- `99: <View style={styles.moodRow}>{moodOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => setSelectedMood(option.value)} style={[styles.moodOption, selectedMood === option.value && { background`
- `111: <View style={styles.tagWrap}>{tagOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => toggleTag(option.value)} style={[styles.tag, { borderColor: colors.border }, selectedTags.includes(optio`
- `118: <TouchableOpacity accessibilityRole="button" disabled={!selectedMood || saving} onPress={() => void submit()} style={[styles.saveButton, { backgroundColor: selectedMoodColor, opacity: !selectedMood || saving ? 0.55 : 1 }]}>{saving ? <Activi`
- `121: {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /><AppText variant="caption" color={colors.textSecondary}>{t('loading')}</AppText></View> : loadError ? <View style={styles.empty}><AppText variant="caption" color={`
### backend_consumers_or_contracts
- `47: const result: unknown = await apiFetch('/mental-health/mood?days=30');`
- `68: await apiFetch('/mental-health/mood', { method: 'POST', body: JSON.stringify(payload) });`
### auth_ownership
- `83: {[1, 2, 3, 4, 5].map((number) => <TouchableOpacity key={number} accessibilityRole="button" onPress={() => onChange(number)} style={[styles.scaleDot, { borderColor: selectedMoodColor }, value === number && { backgroundColor: selectedMoodColo`
- `91: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`
- `99: <View style={styles.moodRow}>{moodOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => setSelectedMood(option.value)} style={[styles.moodOption, selectedMood === option.value && { background`
- `111: <View style={styles.tagWrap}>{tagOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => toggleTag(option.value)} style={[styles.tag, { borderColor: colors.border }, selectedTags.includes(optio`
- `118: <TouchableOpacity accessibilityRole="button" disabled={!selectedMood || saving} onPress={() => void submit()} style={[styles.saveButton, { backgroundColor: selectedMoodColor, opacity: !selectedMood || saving ? 0.55 : 1 }]}>{saving ? <Activi`
### state_transitions
- `1: import React, { useCallback, useEffect, useMemo, useState } from 'react';`
- `30: const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);`
- `31: const [selectedTags, setSelectedTags] = useState<string[]>([]);`
- `32: const [note, setNote] = useState('');`
- `33: const [energy, setEnergy] = useState<number | undefined>();`
- `34: const [stress, setStress] = useState<number | undefined>();`
- `35: const [sleep, setSleep] = useState('');`
- `36: const [entries, setEntries] = useState<MoodEntry[]>([]);`
- `37: const [loading, setLoading] = useState(true);`
- `38: const [loadError, setLoadError] = useState(false);`
- `39: const [saving, setSaving] = useState(false);`
- `40: const [saveError, setSaveError] = useState(false);`
### payment_insurance_relevance
- `11: import { buildMoodJournalPayload, parseMoodHistory, type MoodEntry, type MoodValue } from '../../src/utils/mood-journal-contract';`
- `67: const payload = buildMoodJournalPayload({ mood: selectedMood, energy, stress, sleep, note, tags: selectedTags });`
- `68: await apiFetch('/mental-health/mood', { method: 'POST', body: JSON.stringify(payload) });`
- `97: <View style={[styles.card, { backgroundColor: colors.surface }]}>`
- `102: <View style={[styles.card, { backgroundColor: colors.surface }]}>`
- `109: <View style={[styles.card, { backgroundColor: colors.surface }]}>`
- `132: container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 7, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'cen`
### error_empty_loading_retry_cancel
- `37: const [loading, setLoading] = useState(true);`
- `38: const [loadError, setLoadError] = useState(false);`
- `40: const [saveError, setSaveError] = useState(false);`
- `44: setLoading(true);`
- `45: setLoadError(false);`
- `49: } catch {`
- `51: setLoadError(true);`
- `53: setLoading(false);`
- `65: setSaving(true); setSaveError(false); setSaved(false);`
- `70: } catch {`
- `71: setSaveError(true);`
- `91: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
