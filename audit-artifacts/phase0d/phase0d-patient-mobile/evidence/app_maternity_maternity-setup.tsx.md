# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/maternity/maternity-setup.tsx`
- **Member SHA-256:** `e0aa4f39e9f62d77644b087517e001b2d2ae2ec56dc8e69834e7ac4fe0055e59`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `12: export default function MaternitySetupScreen() {`
- `15: const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setError(null); try { await apiFetch('/maternity/profile', { method: 'POST', body: JSON.st`
- `16: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
### backend_consumers_or_contracts
- `15: const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setError(null); try { await apiFetch('/maternity/profile', { method: 'POST', body: JSON.st`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';`
- `14: const [mode, setMode] = React.useState<Mode>('cycle'); const [lmp, setLmp] = React.useState(''); const [dueDate, setDueDate] = React.useState(''); const [cycleLength, setCycleLength] = React.useState(''); const [regular, setRegular] = React`
- `15: const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setError(null); try { await apiFetch('/maternity/profile', { method: 'POST', body: JSON.st`
- `16: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
- `18: const styles = StyleSheet.create({ container:{ flex:1 }, header:{ flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:10 }, titleWrap:{ flex:1, alignItems:'center', gap:2 }, `
### payment_insurance_relevance
- `7: import { AppText, Button, Card, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `16: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
### error_empty_loading_retry_cancel
- `14: const [mode, setMode] = React.useState<Mode>('cycle'); const [lmp, setLmp] = React.useState(''); const [dueDate, setDueDate] = React.useState(''); const [cycleLength, setCycleLength] = React.useState(''); const [regular, setRegular] = React`
- `15: const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setError(null); try { await apiFetch('/maternity/profile', { method: 'POST', body: JSON.st`
- `16: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><`
- `18: const styles = StyleSheet.create({ container:{ flex:1 }, header:{ flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:10 }, titleWrap:{ flex:1, alignItems:'center', gap:2 }, `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
