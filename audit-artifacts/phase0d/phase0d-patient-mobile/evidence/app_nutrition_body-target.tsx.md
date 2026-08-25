# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nutrition/body-target.tsx`
- **Member SHA-256:** `0d7a415ec0049763cf91e2aa3093ebd02d43863452e236ca5070df9e968f5bc3`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `14: export default function BodyTargetScreen() {`
- `21: const save = async () => { if (![height, weight, targetWeight, calorieTarget, waterTarget].every(finite)) { setError(t('formRequired')); return; } setSaving(true); setError(null); try { const response: any = await apiFetch('/nutrition/profi`
- `23: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
### backend_consumers_or_contracts
- `18: React.useEffect(() => { apiFetch('/nutrition/profile').then((response: any) => { const p: Profile = response?.data || response || {}; setGoal(p.goal || 'healthy_lifestyle'); setActivity(p.activity_level || 'moderate'); setHeight(p.height_cm`
- `21: const save = async () => { if (![height, weight, targetWeight, calorieTarget, waterTarget].every(finite)) { setError(t('formRequired')); return; } setSaving(true); setError(null); try { const response: any = await apiFetch('/nutrition/profi`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `16: const [goal, setGoal] = React.useState('healthy_lifestyle'); const [activity, setActivity] = React.useState('moderate'); const [height, setHeight] = React.useState(''); const [weight, setWeight] = React.useState(''); const [targetWeight, se`
- `17: const [bmi, setBmi] = React.useState<number | null>(null); const [loading, setLoading] = React.useState(true); const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `18: React.useEffect(() => { apiFetch('/nutrition/profile').then((response: any) => { const p: Profile = response?.data || response || {}; setGoal(p.goal || 'healthy_lifestyle'); setActivity(p.activity_level || 'moderate'); setHeight(p.height_cm`
- `21: const save = async () => { if (![height, weight, targetWeight, calorieTarget, waterTarget].every(finite)) { setError(t('formRequired')); return; } setSaving(true); setError(null); try { const response: any = await apiFetch('/nutrition/profi`
- `23: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
- `26: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { flex: 1, alignItems: 'center'`
### payment_insurance_relevance
- `7: import { AppText, Button, Card, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `23: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
### error_empty_loading_retry_cancel
- `17: const [bmi, setBmi] = React.useState<number | null>(null); const [loading, setLoading] = React.useState(true); const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `18: React.useEffect(() => { apiFetch('/nutrition/profile').then((response: any) => { const p: Profile = response?.data || response || {}; setGoal(p.goal || 'healthy_lifestyle'); setActivity(p.activity_level || 'moderate'); setHeight(p.height_cm`
- `21: const save = async () => { if (![height, weight, targetWeight, calorieTarget, waterTarget].every(finite)) { setError(t('formRequired')); return; } setSaving(true); setError(null); try { const response: any = await apiFetch('/nutrition/profi`
- `23: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
- `26: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { flex: 1, alignItems: 'center'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
