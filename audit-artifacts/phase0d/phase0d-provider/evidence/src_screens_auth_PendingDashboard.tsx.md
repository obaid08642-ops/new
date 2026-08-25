# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/auth/PendingDashboard.tsx`
- **Member SHA-256:** `f78bd95065bf73eb8fce5c64bfb4dd0bf2bbdad78ca8cbff1b2710b8900ee244`
- **Line count:** 137
- **Read range:** `1-137`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: export function PendingDashboard({ onExplore, onLogout, providerType }: { onExplore: () => void; onLogout: () => void; providerType?: string }) {`
- `91: <NBtn label={AR ? 'إرسال رمز التحقق' : 'Send Verification Code'} onPress={sendOtp} loading={loading} />`
- `101: <NBtn label={AR ? 'تأكيد الرمز' : 'Verify'} onPress={verifyOtp} loading={loading} />`
- `131: <NBtn label={AR ? 'استكشاف التطبيق' : 'Explore App'} onPress={onExplore} style={{ marginBottom: SP.md }} />`
- `132: <NBtn label={AR ? 'تسجيل الخروج' : 'Log Out'} variant="ghost" onPress={onLogout} />`
### backend_consumers_or_contracts
- `8: import client from '../../api/client';`
- `34: await client.post('/auth/send-otp', { identifier: user.email });`
- `47: await client.post('/auth/verify-otp', { identifier: user.email, code: otp });`
### auth_ownership
- `11: export function PendingDashboard({ onExplore, onLogout, providerType }: { onExplore: () => void; onLogout: () => void; providerType?: string }) {`
- `20: const [otpSent, setOtpSent] = useState(false);`
- `21: const [otp, setOtp] = useState('');`
- `30: const sendOtp = async () => {`
- `34: await client.post('/auth/send-otp', { identifier: user.email });`
- `35: setOtpSent(true);`
- `37: show(AR ? 'فشل إرسال رمز التحقق' : 'Failed to send OTP', 'error');`
- `43: const verifyOtp = async () => {`
- `44: if (!otp || !user?.email) return;`
- `47: await client.post('/auth/verify-otp', { identifier: user.email, code: otp });`
- `49: // refresh global state`
- `51: show(AR ? 'رمز غير صحيح أو منتهي الصلاحية' : 'Invalid OTP or expired', 'error');`
### state_transitions
- `1: import React, { useState, useEffect, useRef } from 'react';`
- `2: import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, StatusBar } from 'react-native';`
- `11: export function PendingDashboard({ onExplore, onLogout, providerType }: { onExplore: () => void; onLogout: () => void; providerType?: string }) {`
- `19: const [loading, setLoading] = useState(false);`
- `20: const [otpSent, setOtpSent] = useState(false);`
- `21: const [otp, setOtp] = useState('');`
- `22: const [emailVerified, setEmailVerified] = useState(false);`
- `32: setLoading(true);`
- `37: show(AR ? 'فشل إرسال رمز التحقق' : 'Failed to send OTP', 'error');`
- `39: setLoading(false);`
- `45: setLoading(true);`
- `49: // refresh global state`
### payment_insurance_relevance
- `5: import { NHeader, NCard, NBtn, NInput } from '../../components/ui';`
- `82: <NCard style={{ marginBottom: SP.xl, borderColor: theme.warn, borderWidth: 1 }}>`
- `104: </NCard>`
- `108: <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>`
- `112: </NCard>`
- `115: <NCard style={{ marginBottom: SP.xl }}>`
- `129: </NCard>`
### error_empty_loading_retry_cancel
- `11: export function PendingDashboard({ onExplore, onLogout, providerType }: { onExplore: () => void; onLogout: () => void; providerType?: string }) {`
- `19: const [loading, setLoading] = useState(false);`
- `32: setLoading(true);`
- `36: } catch (e) {`
- `37: show(AR ? 'فشل إرسال رمز التحقق' : 'Failed to send OTP', 'error');`
- `39: setLoading(false);`
- `45: setLoading(true);`
- `50: } catch (e) {`
- `51: show(AR ? 'رمز غير صحيح أو منتهي الصلاحية' : 'Invalid OTP or expired', 'error');`
- `53: setLoading(false);`
- `91: <NBtn label={AR ? 'إرسال رمز التحقق' : 'Send Verification Code'} onPress={sendOtp} loading={loading} />`
- `101: <NBtn label={AR ? 'تأكيد الرمز' : 'Verify'} onPress={verifyOtp} loading={loading} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
