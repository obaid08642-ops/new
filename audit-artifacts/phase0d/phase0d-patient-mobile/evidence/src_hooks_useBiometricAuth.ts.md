# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/hooks/useBiometricAuth.ts`
- **Member SHA-256:** `301588f29f5c74d0ef409f5dbfb1be18063b6aa7aa03059df212e700fd7912e8`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: * Biometric login (Face ID / Fingerprint) — production contract:`
- `10: *  - NEVER force-enable: we OFFER once after the first successful login.`
- `12: *    protected content (falls back to normal login when unavailable/cancelled).`
- `30: /** Offer biometric unlock ONCE after first successful login (never forced). */`
- `31: const offerAfterLogin = useCallback(async () => {`
- `40: { text: 'لاحقاً', style: 'cancel' },`
- `43: onPress: async () => {`
- `71: return { supported, enabled, offerAfterLogin, requireUnlock, disable };`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: * Biometric login (Face ID / Fingerprint) — production contract:`
- `10: *  - NEVER force-enable: we OFFER once after the first successful login.`
- `12: *    protected content (falls back to normal login when unavailable/cancelled).`
- `30: /** Offer biometric unlock ONCE after first successful login (never forced). */`
- `31: const offerAfterLogin = useCallback(async () => {`
- `71: return { supported, enabled, offerAfterLogin, requireUnlock, disable };`
### state_transitions
- `1: import { useState, useEffect, useCallback } from 'react';`
- `10: *  - NEVER force-enable: we OFFER once after the first successful login.`
- `12: *    protected content (falls back to normal login when unavailable/cancelled).`
- `15: const [supported, setSupported] = useState(false);`
- `16: const [enabled, setEnabled] = useState(false);`
- `30: /** Offer biometric unlock ONCE after first successful login (never forced). */`
- `40: { text: 'لاحقاً', style: 'cancel' },`
- `45: if (ok.success) {`
- `60: return ok.success;`
- `62: return true; // don't lock the user out on hardware errors`
### payment_insurance_relevance
- `10: *  - NEVER force-enable: we OFFER once after the first successful login.`
- `30: /** Offer biometric unlock ONCE after first successful login (never forced). */`
- `31: const offerAfterLogin = useCallback(async () => {`
- `71: return { supported, enabled, offerAfterLogin, requireUnlock, disable };`
### error_empty_loading_retry_cancel
- `12: *    protected content (falls back to normal login when unavailable/cancelled).`
- `26: } catch { setSupported(false); }`
- `40: { text: 'لاحقاً', style: 'cancel' },`
- `61: } catch {`
- `62: return true; // don't lock the user out on hardware errors`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
