# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/medication-reminder-add.tsx`
- **Member SHA-256:** `81075056982b888ce5d0276024781cbfa4e6e3f483e812040a8db8c4f7001520`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router, useLocalSearchParams } from 'expo-router';`
- `16: export default function MedicationReminderAddScreen() {`
- `60: router.replace({ pathname: '/health/medication-reminder-list', params: notificationResult.permissionDenied ? { alertStatus: 'permission_denied' } : { alertStatus: 'synced' } });`
- `66: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3">{editing ? t('editTitle') : t('addTitle')}</AppText><AppText variant="caption" color={colors.t`
- `70: <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colors} /><View style={styles.times}>{TIME_OPTIONS.map((time) => { const selected = times.includ`
- `75: <Animated.View entering={FadeInDown.delay(300).duration(300)}><Button label={editing ? t('saveChanges') : t('saveReminder')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>`
### backend_consumers_or_contracts
- `32: const response: any = await apiFetch('/health/reminders');`
- `52: const response: any = await apiFetch(editing ? `/health/reminders/${id}` : '/health/reminders', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });`
### auth_ownership
- `58: title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(saved, name.trim()), dose: saved.dose || dose.trim() }), taken: t('takeFromAlert'), snooze: t('snoozeTenMinutes'), permissionDenied: t('alertPermission`
- `60: router.replace({ pathname: '/health/medication-reminder-list', params: notificationResult.permissionDenied ? { alertStatus: 'permission_denied' } : { alertStatus: 'synced' } });`
- `70: <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colors} /><View style={styles.times}>{TIME_OPTIONS.map((time) => { const selected = times.includ`
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';`
- `22: const [name, setName] = React.useState(''); const [dose, setDose] = React.useState(''); const [count, setCount] = React.useState('1'); const [times, setTimes] = React.useState<string[]>(['08:00']);`
- `23: const [frequency, setFrequency] = React.useState('daily'); const [duration, setDuration] = React.useState('30'); const [chronic, setChronic] = React.useState(false); const [pillsRemaining, setPillsRemaining] = React.useState(''); const [ref`
- `24: const [important, setImportant] = React.useState(false); const [refillLeadDays, setRefillLeadDays] = React.useState<2 | 3>(3);`
- `25: const [loading, setLoading] = React.useState(editing); const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `30: setLoading(true); setError(null);`
- `35: if (!item) throw new Error('not_found');`
- `39: } catch { setError(t('saveError')); } finally { setLoading(false); }`
- `47: if (!name.trim() || !dose.trim() || !times.length) { setError(t('formRequired')); return; }`
- `48: if (!Number.isFinite(dosage_count) || dosage_count <= 0 || !Number.isInteger(duration_days) || duration_days < 0 || (pills_remaining !== undefined && (!Number.isInteger(pills_remaining) || pills_remaining < 0))) { setError(t('formInvalid'))`
- `49: setSaving(true); setError(null);`
- `55: if (!reminderId) throw new Error('missing_reminder_id');`
### payment_insurance_relevance
- `7: import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `51: const payload = { medicine_name_ar: name.trim(), dose: dose.trim(), dosage_count, times, time_zone: timeZone.trim(), frequency, duration_days, chronic, pills_remaining, refill_date: refillDate.trim() || undefined, instructions_ar: instructi`
- `52: const response: any = await apiFetch(editing ? `/health/reminders/${id}` : '/health/reminders', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });`
- `68: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}`
- `69: <Animated.View entering={FadeInDown.duration(300)}><Card style={styles.section}><SectionTitle index="1" title={t('medicationAndDose')} colors={colors} /><Input value={name} onChangeText={setName} placeholder={t('medicationName')} /><Input v`
- `70: <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colors} /><View style={styles.times}>{TIME_OPTIONS.map((time) => { const selected = times.includ`
- `71: <Animated.View entering={FadeInDown.delay(140).duration(300)}><Card style={styles.section}><SectionTitle index="3" title={t('frequencyAndDuration')} colors={colors} /><SegmentedControl value={frequency} onChange={setFrequency} options={[{ k`
- `72: <Animated.View entering={FadeInDown.delay(180).duration(300)}><Card style={[styles.section, { borderColor: important ? colors.warning + '70' : colors.border }]}><SectionTitle index="4" title={t('deviceAlerts')} colors={colors} /><SegmentedC`
- `73: {chronic && <Animated.View entering={FadeInDown.duration(260)}><Card style={[styles.section, { borderColor: colors.warning + '55' }]}><SectionTitle index="5" title={t('refillTracking')} colors={colors} /><Input value={pillsRemaining} onChan`
- `74: <Animated.View entering={FadeInDown.delay(230).duration(300)}><Card style={styles.section}><AppText variant="h6" align="right">{t('instructions')}</AppText><Input value={instructions} onChangeText={setInstructions} placeholder={t('instructi`
### error_empty_loading_retry_cancel
- `13: const currentZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };`
- `25: const [loading, setLoading] = React.useState(editing); const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `30: setLoading(true); setError(null);`
- `35: if (!item) throw new Error('not_found');`
- `39: } catch { setError(t('saveError')); } finally { setLoading(false); }`
- `47: if (!name.trim() || !dose.trim() || !times.length) { setError(t('formRequired')); return; }`
- `48: if (!Number.isFinite(dosage_count) || dosage_count <= 0 || !Number.isInteger(duration_days) || duration_days < 0 || (pills_remaining !== undefined && (!Number.isInteger(pills_remaining) || pills_remaining < 0))) { setError(t('formInvalid'))`
- `49: setSaving(true); setError(null);`
- `55: if (!reminderId) throw new Error('missing_reminder_id');`
- `61: } catch { setError(t('saveError')); } finally { setSaving(false); }`
- `67: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `68: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
