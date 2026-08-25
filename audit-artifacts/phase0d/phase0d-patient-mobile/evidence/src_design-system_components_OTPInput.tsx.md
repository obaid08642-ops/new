# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/design-system/components/OTPInput.tsx`
- **Member SHA-256:** `93c710b45b1e1d9dea3e54f71a3c0b506b7fe314d4128c904f070ba976495a63`
- **Line count:** 192
- **Read range:** `1-192`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: * DS OTPInput — Premium 4/5/6 digit OTP input with auto-advance,`
- `12: import { BorderRadius, Spacing, Animation } from '../tokens';`
- `18: export interface DSOTPInputProps {`
- `32: export function DSOTPInput({`
- `41: }: DSOTPInputProps) {`
- `128: autoComplete={index === 0 ? (Platform.OS === 'android' ? 'sms-otp' : 'one-time-code') : 'off'}`
- `134: accessibilityLabel={`رقم OTP ${index + 1} من ${length}`}`
### state_transitions
- `3: * paste support, cursor visibility, error state, and RTL.`
- `5: import React, { useRef, useState, useCallback, useEffect } from 'react';`
- `23: error?: string;`
- `37: error,`
- `44: const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);`
- `49: // Focus first empty on mount`
- `52: const firstEmpty = digits.findIndex((d) => d === '');`
- `53: refs.current[firstEmpty === -1 ? length - 1 : firstEmpty]?.focus();`
- `109: const isError = Boolean(error);`
- `111: const borderColor = isError`
- `112: ? colors.error`
- `154: {/* Error */}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: * paste support, cursor visibility, error state, and RTL.`
- `23: error?: string;`
- `37: error,`
- `49: // Focus first empty on mount`
- `52: const firstEmpty = digits.findIndex((d) => d === '');`
- `53: refs.current[firstEmpty === -1 ? length - 1 : firstEmpty]?.focus();`
- `109: const isError = Boolean(error);`
- `111: const borderColor = isError`
- `112: ? colors.error`
- `154: {/* Error */}`
- `155: {error && (`
- `158: color={colors.error}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
