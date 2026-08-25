# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/OtpModal.tsx`
- **Member SHA-256:** `ae0594d1da8ca4a460bbb580f793154f5437805aa18bf66814de24819e860921`
- **Line count:** 185
- **Read range:** `1-185`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `79: const submit = async () => {`
- `113: <TouchableOpacity onPress={onClose} style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>`
- `172: onPress={submit}`
- `176: <TouchableOpacity style={{ marginTop: SP.lg, alignItems: 'center' }} onPress={onResend} disabled={!onResend}>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `8: interface OtpModalProps {`
- `11: onVerify: (otp: string) => Promise<boolean>;`
- `17: const OTP_LEN = 6;`
- `19: export const OtpModal = ({ visible, onClose, onVerify, target, type = 'email', onResend }: OtpModalProps) => {`
- `24: const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));`
- `33: setOtp(Array(OTP_LEN).fill(''));`
- `42: const clean = digits.replace(/\D/g, '').slice(0, OTP_LEN - startIndex);`
- `44: setOtp(prev => {`
- `51: if (nextEmpty < OTP_LEN) inputs.current[nextEmpty]?.focus();`
- `52: else inputs.current[OTP_LEN - 1]?.blur();`
- `62: const newOtp = [...otp];`
- `63: newOtp[index] = val;`
### state_transitions
- `1: import React, { useState, useRef, useEffect } from 'react';`
- `24: const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));`
- `25: const [loading, setLoading] = useState(false);`
- `26: const [error, setError] = useState('');`
- `34: setError('');`
- `49: setError('');`
- `50: const nextEmpty = startIndex + clean.length;`
- `51: if (nextEmpty < OTP_LEN) inputs.current[nextEmpty]?.focus();`
- `65: setError('');`
- `75: setError('');`
- `82: setError(AR ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the full code');`
- `85: setLoading(true);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(false);`
- `26: const [error, setError] = useState('');`
- `34: setError('');`
- `35: const t = setTimeout(() => inputs.current[0]?.focus(), 350);`
- `36: return () => clearTimeout(t);`
- `49: setError('');`
- `50: const nextEmpty = startIndex + clean.length;`
- `51: if (nextEmpty < OTP_LEN) inputs.current[nextEmpty]?.focus();`
- `65: setError('');`
- `75: setError('');`
- `82: setError(AR ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the full code');`
- `85: setLoading(true);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
