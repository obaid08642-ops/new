# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/shared/RegistrationSuccess.tsx`
- **Member SHA-256:** `0027df5ba2cc3849acdce143e6eba90fc16f12ba68bcc1c557da23f3a965ad7b`
- **Line count:** 181
- **Read range:** `1-181`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `52: /** Download the signed partnership contract PDF (only when admin granted visibility). */`
- `53: const downloadContract = async () => {`
- `72: else show(AR ? 'تعذر تحميل العقد' : 'Could not download the contract', 'error');`
- `85: {AR ? 'تم إرسال طلبك بنجاح!' : 'Application Submitted!'}`
- `103: onPress={handleSendOtp}`
- `129: onPress={handleVerify}`
- `151: onPress={downloadContract}`
- `158: {AR ? 'تحميل عقد الشراكة الموقّع' : 'Download Signed Partnership Contract'}`
- `165: onPress={() => {`
### backend_consumers_or_contracts
- `5: import client from '../../api/client';`
- `6: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
### auth_ownership
- `6: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `16: const [otpSent, setOtpSent] = useState(false);`
- `17: const [otp, setOtp] = useState('');`
- `21: const handleSendOtp = async () => {`
- `25: await sendEmailOtp(email);`
- `26: setOtpSent(true);`
- `34: if (!otp || otp.length < 6) {`
- `40: const ok = await verifyEmailOtp(email || '', otp);`
- `52: /** Download the signed partnership contract PDF (only when admin granted visibility). */`
- `61: const perm = await LegacyFS.StorageAccessFramework.requestDirectoryPermissionsAsync();`
- `71: if (st === 403) show(AR ? 'العقد غير متاح بعد — يمكن للإدارة إتاحته لك من لوحة المراجعة' : 'Contract not shared yet — admin can enable it from the review panel', 'error');`
- `89: {AR ? 'طلبك قيد المراجعة حالياً من قبل الإدارة. سيتم إشعارك فور الموافقة.' : 'Your application is under review by admin. You will be notified upon approval.'}`
### state_transitions
- `1: import React, { useState } from 'react';`
- `9: export function RegistrationSuccess({ onDone, email, providerType = 'provider' }: { onDone: () => void; email?: string; providerType?: string }) {`
- `15: const [loading, setLoading] = useState(false);`
- `16: const [otpSent, setOtpSent] = useState(false);`
- `17: const [otp, setOtp] = useState('');`
- `18: const [verified, setVerified] = useState(false);`
- `19: const [contractLoading, setContractLoading] = useState(false);`
- `22: if (!email) { show(AR ? 'لا يوجد بريد إلكتروني مسجل' : 'No email on file', 'error'); return; }`
- `23: setLoading(true);`
- `27: show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to email', 'success');`
- `29: show(AR ? 'تعذر إرسال الرمز — حاول بعد قليل' : 'Could not send code — try again shortly', 'error');`
- `30: } finally { setLoading(false); }`
### payment_insurance_relevance
- `93: <View style={{ width: '100%', backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 24 }}>`
- `142: <View style={{ width: '100%', backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>`
- `172: style={{ width: '100%', backgroundColor: theme.card, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>`
### error_empty_loading_retry_cancel
- `15: const [loading, setLoading] = useState(false);`
- `19: const [contractLoading, setContractLoading] = useState(false);`
- `22: if (!email) { show(AR ? 'لا يوجد بريد إلكتروني مسجل' : 'No email on file', 'error'); return; }`
- `23: setLoading(true);`
- `28: } catch {`
- `29: show(AR ? 'تعذر إرسال الرمز — حاول بعد قليل' : 'Could not send code — try again shortly', 'error');`
- `30: } finally { setLoading(false); }`
- `35: show(AR ? 'الرمز غير صحيح' : 'Invalid code', 'error');`
- `38: setLoading(true);`
- `45: show(AR ? 'الرمز غير صحيح أو منتهي' : 'Code is incorrect or expired', 'error');`
- `47: } catch {`
- `48: show(AR ? 'تعذر التحقق — حاول مجدداً' : 'Verification failed — try again', 'error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
