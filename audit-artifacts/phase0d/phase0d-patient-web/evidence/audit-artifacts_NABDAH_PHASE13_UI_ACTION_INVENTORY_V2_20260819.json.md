# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_UI_ACTION_INVENTORY_V2_20260819.json`
- **Member SHA-256:** `a4d4d7169173f75f00dbfb9e32098f0f0513fbba02b29ccf3f8b68d40a5adede`
- **Line count:** 9899
- **Read range:** `1-9899`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `27: "event": "onPress",`
- `28: "expression": "() => handlePress(item.screen)",`
- `36: "event": "onPress",`
- `37: "expression": "() => handlePress(item.screen)",`
- `45: "event": "onPress",`
- `54: "event": "onPress",`
- `63: "event": "onPress",`
- `72: "event": "onPress",`
- `81: "event": "onPress",`
- `82: "expression": "() => router.push('/notifications')",`
- `90: "event": "onPress",`
- `91: "expression": "() => router.push('/profile')",`
### backend_consumers_or_contracts
- `82: "expression": "() => router.push('/notifications')",`
- `463: "source_file": "src/features/consultation/InsuranceCopayScreen.tsx",`
- `1084: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1093: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1102: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1111: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1120: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1129: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1138: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1147: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1156: "source_file": "src/screens/auth/AuthScreens.tsx",`
- `1165: "source_file": "src/screens/auth/AuthScreens.tsx",`
### auth_ownership
- `3: "method": "Static JSX event-handler inventory v2. Named handlers are resolved within the same file and classified by their first 1800 characters. Cross-file handlers, indirect callbacks and semantic ownership still require manual evidence."`
- `18: "admin": {`
- `553: "source_file": "src/components/OtpModal.tsx",`
- `562: "source_file": "src/components/OtpModal.tsx",`
- `571: "source_file": "src/components/OtpModal.tsx",`
- `1117: "expression": "onLogin",`
- `1118: "handler_reference": "onLogin",`
- `1126: "expression": "() => { setSheetOpen(false); onLogin();",`
- `1162: "expression": "handleLogin",`
- `1163: "handler_reference": "handleLogin",`
- `1216: "expression": "sendOtp",`
- `1217: "handler_reference": "sendOtp",`
### state_transitions
- `118: "expression": "onRetry",`
- `119: "handler_reference": "onRetry",`
- `121: "source_file": "src/components/ScreenStates.tsx",`
- `127: "expression": "onRetry",`
- `128: "handler_reference": "onRetry",`
- `130: "source_file": "src/components/ScreenStates.tsx",`
- `397: "expression": "handleCancel",`
- `398: "handler_reference": "handleCancel",`
- `409: "source_file": "src/design-system/components/States.tsx",`
- `418: "source_file": "src/design-system/components/States.tsx",`
- `424: "expression": "onRetry",`
- `425: "handler_reference": "onRetry",`
### payment_insurance_relevance
- `346: "source_file": "src/design-system/components/Card.tsx",`
- `355: "source_file": "src/design-system/components/Card.tsx",`
- `460: "expression": "() => navigation.navigate('PaymentGateway')",`
- `463: "source_file": "src/features/consultation/InsuranceCopayScreen.tsx",`
- `1090: "expression": "() => handleSelectCard(pt, idx)",`
- `1342: "expression": "() => setInsuranceModalReq(req)",`
- `1414: "expression": "submitInsuranceGatekeeper",`
- `1415: "handler_reference": "submitInsuranceGatekeeper",`
- `1738: "expression": "() => onNavigate('insurance_config')",`
- `2836: "expression": "() => show(tr('عرض بطاقة التوثيق', 'Credential card'), 'info')",`
- `3232: "expression": "handleSavePrices",`
- `3233: "handler_reference": "handleSavePrices",`
### error_empty_loading_retry_cancel
- `118: "expression": "onRetry",`
- `119: "handler_reference": "onRetry",`
- `127: "expression": "onRetry",`
- `128: "handler_reference": "onRetry",`
- `397: "expression": "handleCancel",`
- `398: "handler_reference": "handleCancel",`
- `424: "expression": "onRetry",`
- `425: "handler_reference": "onRetry",`
- `490: "source_file": "src/services/ErrorHandler.tsx",`
- `505: "expression": "async () => { if (!policy) { show(tr('لا يمكن قبول عقد غير محمل من الخادم.', 'An agreement not loaded from the server cannot be accepted.'), 'error'); return;",`
- `703: "expression": "onCancel",`
- `704: "handler_reference": "onCancel",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
