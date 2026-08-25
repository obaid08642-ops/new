# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/auth/AuthScreens.tsx`
- **Member SHA-256:** `49231fcedae9b21cc156d69dd9e881c5191fdf5467350d2917dcbfddc908cefb`
- **Line count:** 906
- **Read range:** `1-906`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * ║ NABDAH PLUS – AUTH SCREENS (COMPLETE) ║`
- `4: * ║ Splash · Welcome · Login · ForgotPassword · OTP · PendingApproval ║`
- `26: // SPLASH SCREEN`
- `28: export function SplashScreen({ onDone }: { onDone: () => void }) {`
- `70: // WELCOME SCREEN — PROVIDER SELECTION`
- `72: export function WelcomeScreen({`
- `73: onSelectType, onLogin, onGuestJobs, onGuestDrugIndex`
- `74: }: { onSelectType: (type: string) => void; onLogin: () => void; onGuestJobs?: () => void; onGuestDrugIndex?: () => void }) {`
- `85: const { bioLogin } = useAuth();`
- `99: const r = await bioLogin();`
- `152: <TouchableOpacity onPress={toggleLang}`
- `202: <TouchableOpacity onPress={() => handleSelectCard(pt, idx)} activeOpacity={0.85}>`
### backend_consumers_or_contracts
- `609: const res = await fetch(`${API_BASE}/provider/auth/forgot-password`, {`
- `631: const res = await fetch(`${API_BASE}/provider/auth/verify-reset-code`, {`
- `653: const res = await fetch(`${API_BASE}/provider/auth/reset-password`, {`
### auth_ownership
- `4: * ║ Splash · Welcome · Login · ForgotPassword · OTP · PendingApproval ║`
- `16: NCheckbox, NOTP, NStepBar, NDivider, NScroll, NLogo, NSheet, NThemeSlider`
- `19: import { Biometric, Validate, RateLimiter, buildHeaders, Vault, SK, Tokens } from '../../security/Security';`
- `73: onSelectType, onLogin, onGuestJobs, onGuestDrugIndex`
- `74: }: { onSelectType: (type: string) => void; onLogin: () => void; onGuestJobs?: () => void; onGuestDrugIndex?: () => void }) {`
- `85: const { bioLogin } = useAuth();`
- `96: const hasRefresh = await Tokens.getRefresh();`
- `97: if (enabled === 'true' && hasRefresh) {`
- `99: const r = await bioLogin();`
- `275: {/* Global Login Link */}`
- `276: <TouchableOpacity onPress={onLogin} style={{ alignItems: 'center', paddingVertical: SP.sm, marginBottom: SP.lg }}>`
- `325: onLogin();`
### state_transitions
- `4: * ║ Splash · Welcome · Login · ForgotPassword · OTP · PendingApproval ║`
- `7: import React, { useRef, useEffect, useState } from 'react';`
- `10: Animated, StatusBar, Dimensions, KeyboardAvoidingView,`
- `46: <StatusBar barStyle="light-content" backgroundColor={theme.primary} />`
- `79: const [selectedPt, setSelectedPt] = useState<any | null>(null);`
- `80: const [sheetOpen, setSheetOpen] = useState(false);`
- `102: show(msg, 'error');`
- `103: if (msg.includes('Network Error') || msg.includes('Network request failed')) {`
- `108: const msg = err.message || err.error || err;`
- `109: show(AR ? `خطأ: ${msg}` : `Error: ${msg}`, 'error');`
- `111: if (String(msg).includes('Network') || String(msg).includes('Network request failed') || String(msg).includes('timeout')) {`
- `131: <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />`
### payment_insurance_relevance
- `15: NBtn, NCard, NInput, NPhoneInput, NPassStrength,`
- `83: const cardsAnim = useRef(new Animated.Value(0)).current;`
- `91: Animated.spring(cardsAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),`
- `119: const handleSelectCard = (pt: any, idx: number) => {`
- `186: : 'Choose your account type to start offering medical services'}`
- `192: opacity: cardsAnim,`
- `202: <TouchableOpacity onPress={() => handleSelectCard(pt, idx)} activeOpacity={0.85}>`
- `204: backgroundColor: theme.card,`
- `457: <NCard style={{ marginBottom: SP.xl }}>`
- `471: </NCard>`
- `518: <View style={{ backgroundColor: theme.card, padding: SP.xl, borderRadius: R.xl, width: '100%', alignItems: 'center' }}>`
- `540: <View style={{ backgroundColor: theme.card, borderRadius: R.xl, padding: SP.xl, width: '100%' }}>`
### error_empty_loading_retry_cancel
- `4: * ║ Splash · Welcome · Login · ForgotPassword · OTP · PendingApproval ║`
- `41: ]).start(() => setTimeout(onDone, 900));`
- `102: show(msg, 'error');`
- `103: if (msg.includes('Network Error') || msg.includes('Network request failed')) {`
- `107: } catch (err: any) {`
- `108: const msg = err.message || err.error || err;`
- `109: show(AR ? `خطأ: ${msg}` : `Error: ${msg}`, 'error');`
- `111: if (String(msg).includes('Network') || String(msg).includes('Network request failed') || String(msg).includes('timeout')) {`
- `362: const [loading, setLoading] = useState(false);`
- `391: setLoading(true);`
- `398: setLoading(false);`
- `407: show(r.err ?? (AR ? 'خطأ في تسجيل الدخول' : 'Login failed'), 'error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
