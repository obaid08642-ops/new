# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/mental-health/hub.tsx`
- **Member SHA-256:** `96fc93d538263877285a915572939d0e8b0fce7e337f4d11989f31fcaed1862d`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `10: type RouteCard = { key: 'moodJournal' | 'urgentHelp' | 'consultation'; icon: IconName; color: string; route: string; descriptionKey: 'moodPrompt' | 'urgentBody' | 'subtitle' };`
- `12: export default function MentalHealthHubScreen() {`
- `16: const cards: RouteCard[] = [`
- `17: { key: 'moodJournal', icon: 'edit', color: '#7A6BEA', route: '/mental-health/mood-journal', descriptionKey: 'moodPrompt' },`
- `18: { key: 'consultation', icon: 'doctor', color: '#2563EB', route: '/(tabs)/consultations', descriptionKey: 'subtitle' },`
- `19: { key: 'urgentHelp', icon: 'call', color: '#DC2626', route: '/mental-health/crisis-support', descriptionKey: 'urgentBody' },`
- `26: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}>`
- `40: <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: card.color + '33' }]}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `26: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}>`
- `40: <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: card.color + '33' }]}>`
### state_transitions
- `2: import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';`
- `24: <StatusBar barStyle="light-content" />`
- `26: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}>`
### payment_insurance_relevance
- `10: type RouteCard = { key: 'moodJournal' | 'urgentHelp' | 'consultation'; icon: IconName; color: string; route: string; descriptionKey: 'moodPrompt' | 'urgentBody' | 'subtitle' };`
- `16: const cards: RouteCard[] = [`
- `39: {cards.map((card) => (`
- `40: <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: card.color + '33' }]}>`
- `41: <View style={[styles.iconWrap, { backgroundColor: card.color + '1A' }]}>`
- `42: <Icon name={card.icon} size={24} color={card.color} />`
- `44: <View style={styles.cardText}>`
- `45: <AppText variant="h6" color={colors.textPrimary}>{t(card.key)}</AppText>`
- `46: <AppText variant="caption" color={colors.textTertiary} numberOfLines={card.key === 'urgentHelp' ? 3 : 2}>{t(card.descriptionKey)}</AppText>`
- `67: card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18, borderWidth: 1 },`
- `69: cardText: { flex: 1, alignItems: 'flex-end', gap: 4 },`
### error_empty_loading_retry_cancel
- `26: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
