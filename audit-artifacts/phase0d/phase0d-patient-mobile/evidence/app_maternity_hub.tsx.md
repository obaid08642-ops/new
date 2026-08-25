# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/maternity/hub.tsx`
- **Member SHA-256:** `cba131a48ea91b43bad1661bfdbdc2ba34cc9a8e7f22c78832ccb84381f77e6f`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `14: export default function MaternityHubScreen() {`
- `20: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.secondary `
### backend_consumers_or_contracts
- `17: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const response: any = await apiFetch('/maternity/profile'); setProfile(response?.data || response); } catch { setError(t('error')); setProfile(null); } fin`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `16: const [profile, setProfile] = React.useState<Profile | null>(null); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null);`
- `17: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const response: any = await apiFetch('/maternity/profile'); setProfile(response?.data || response); } catch { setError(t('error')); setProfile(null); } fin`
- `20: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.secondary `
- `25: const styles = StyleSheet.create({ container:{flex:1}, header:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingBottom:20,borderBottomLeftRadius:28,borderBottomRightRadius:28}, title`
### payment_insurance_relevance
- `8: import { AppText, Badge, Button, Card, IconButton } from '../../src/components/ui';`
- `20: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.secondary `
- `22: function PregnancyCard({ profile, t, format, colors }: any) { return <Animated.View entering={FadeInDown.duration(300)}><Card style={[styles.hero, { backgroundColor: colors.secondarySurface, borderColor: colors.secondary + '33' }]}><View st`
- `23: function CycleCard({ profile, cycle, t, format, colors }: any) { return <Animated.View entering={FadeInDown.duration(300)}><Card style={[styles.hero, { backgroundColor: colors.secondarySurface, borderColor: colors.secondary + '33' }]}><View`
### error_empty_loading_retry_cancel
- `16: const [profile, setProfile] = React.useState<Profile | null>(null); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null);`
- `17: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const response: any = await apiFetch('/maternity/profile'); setProfile(response?.data || response); } catch { setError(t('error')); setProfile(null); } fin`
- `20: return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.secondary `
- `25: const styles = StyleSheet.create({ container:{flex:1}, header:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingBottom:20,borderBottomLeftRadius:28,borderBottomRightRadius:28}, title`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
