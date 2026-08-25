# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/login.tsx`
- **Member SHA-256:** `0cccf5e30392476ee3dad530e33c09de9a8669b85ea0ac8f1c4ee59c5b51b314`
- **Line count:** 379
- **Read range:** `1-379`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { useRouter } from 'next/router';`
- `10: * obscurity): the page presents only "نبض — تسجيل دخول". The 2FA flow and`
- `13: export default function AdminLogin() {`
- `14: const router = useRouter();`
- `26: const handleLogin = async (e: React.FormEvent) => {`
- `31: const res = await fetch(`${API_BASE}/api/v1/auth/login`, {`
- `49: completeLogin(data);`
- `62: const res = await fetch(`${API_BASE}/api/v1/auth/login/verify-2fa`, {`
- `69: completeLogin(data);`
- `84: const res = await fetch(`${API_BASE}/api/v1/auth/passkey/login/verify`, {`
- `91: completeLogin(data);`
- `141: const completeLogin = (data: any) => {`
### backend_consumers_or_contracts
- `31: const res = await fetch(`${API_BASE}/api/v1/auth/login`, {`
- `62: const res = await fetch(`${API_BASE}/api/v1/auth/login/verify-2fa`, {`
- `84: const res = await fetch(`${API_BASE}/api/v1/auth/passkey/login/verify`, {`
- `103: const res = await fetch(`${API_BASE}/api/v1/auth/send-otp`, {`
- `122: const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {`
### auth_ownership
- `9: * Discreet sign-in — no role/panel branding by design (security through`
- `11: * role gate stay identical; unauthorized accounts simply see a generic error.`
- `13: export default function AdminLogin() {`
- `17: const [otp, setOtp] = useState('');`
- `18: const [step, setStep] = useState<'credentials' | 'otp' | 'passkey' | 'reset-request' | 'reset-confirm'>('credentials');`
- `26: const handleLogin = async (e: React.FormEvent) => {`
- `31: const res = await fetch(`${API_BASE}/api/v1/auth/login`, {`
- `46: setStep('otp');`
- `49: completeLogin(data);`
- `57: const handleVerifyOtp = async (e: React.FormEvent) => {`
- `62: const res = await fetch(`${API_BASE}/api/v1/auth/login/verify-2fa`, {`
- `65: body: JSON.stringify({ identifier: identifier.trim(), code: otp.trim() }),`
### state_transitions
- `1: import React, { useState } from 'react';`
- `11: * role gate stay identical; unauthorized accounts simply see a generic error.`
- `15: const [identifier, setIdentifier] = useState('');`
- `16: const [password, setPassword] = useState('');`
- `17: const [otp, setOtp] = useState('');`
- `18: const [step, setStep] = useState<'credentials' | 'otp' | 'passkey' | 'reset-request' | 'reset-confirm'>('credentials');`
- `19: const [resetCode, setResetCode] = useState('');`
- `20: const [newPassword, setNewPassword] = useState('');`
- `21: const [info, setInfo] = useState('');`
- `22: const [passkeyOptions, setPasskeyOptions] = useState<any>(null);`
- `23: const [loading, setLoading] = useState(false);`
- `24: const [error, setError] = useState('');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: * role gate stay identical; unauthorized accounts simply see a generic error.`
- `23: const [loading, setLoading] = useState(false);`
- `24: const [error, setError] = useState('');`
- `28: setError('');`
- `29: setLoading(true);`
- `37: if (!res.ok) throw new Error('بيانات الدخول غير صحيحة');`
- `50: } catch (err: any) {`
- `51: setError(err?.message || 'تعذر الاتصال بالخادم');`
- `53: setLoading(false);`
- `59: setError('');`
- `60: setLoading(true);`
- `68: if (!res.ok) throw new Error('رمز التحقق غير صحيح');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
