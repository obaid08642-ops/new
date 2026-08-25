# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/SignatureCanvasModal.tsx`
- **Member SHA-256:** `f111726c5cb4f64166dfcb7f78d53cf2c8aaa277a0c6465132c3c37788bd25be`
- **Line count:** 89
- **Read range:** `1-89`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import SignatureScreen from 'react-native-signature-canvas';`
- `43: <TouchableOpacity onPress={onClose} style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>`
- `49: <SignatureScreen`
- `69: onPress={handleClear}`
- `77: onPress={handleConfirm}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `72: <NIcon name="refresh" size={16} color={theme.textSub} />`
### state_transitions
- `52: onEmpty={() => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `52: onEmpty={() => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
