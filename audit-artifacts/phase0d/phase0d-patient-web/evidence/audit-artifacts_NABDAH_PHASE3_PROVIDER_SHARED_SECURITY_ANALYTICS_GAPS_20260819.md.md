# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_SHARED_SECURITY_ANALYTICS_GAPS_20260819.md`
- **Member SHA-256:** `969b7b81d0f7defab40d199910cb5f146fd51f1f2c06224fe8f935210a50165c`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The shared QR screen explicitly says that health QR generation/scanning is unavailable until secure verification, patient consent and access audit exist. This respects the required **fail-closed** QR governance boundary.`
- `11: | **P0** | Device management and 2FA are fully local/fabricated | The screen starts with a static iPhone, MacBook and Android device list; toggles 2FA/biometrics only in React state; removal/log-out-all show success/confirm UI without serve`
- `12: | **P0** | Wearable screen fabricates connected devices and patient-health readings | Apple Watch/Apple Health show connected status with fixed HR 72/SpO2 98%/steps; connect actions only show toasts. | Remove the integration/health-data cla`
- `16: | **P1** | Shared controls remain AR/EN only and use non-semantic text symbols | Security, clinical-reference, call and financial screens lack six-language/RTL-LTR and accessible icon/formatting coverage. | Complete reviewed AR/EN/UR/HI/BN/`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | **P0** | Device management and 2FA are fully local/fabricated | The screen starts with a static iPhone, MacBook and Android device list; toggles 2FA/biometrics only in React state; removal/log-out-all show success/confirm UI without serve`
- `14: | **P0** | Masked calling is a local timer, not a telephony service | Start/end only mutate state, yet claim that patient sees a masked platform number. | Disable the feature or integrate authorized telephony provisioning, call session/cons`
### state_transitions
- `3: ## Confirmed safe control`
- `7: ## Confirmed defects`
- `11: | **P0** | Device management and 2FA are fully local/fabricated | The screen starts with a static iPhone, MacBook and Android device list; toggles 2FA/biometrics only in React state; removal/log-out-all show success/confirm UI without serve`
- `12: | **P0** | Wearable screen fabricates connected devices and patient-health readings | Apple Watch/Apple Health show connected status with fixed HR 72/SpO2 98%/steps; connect actions only show toasts. | Remove the integration/health-data cla`
- `13: | **P0** | Medical reference library embeds a tiny static drug/interaction/ICD list as a clinical reference | Five medicines, three interactions and five ICD codes are hard-coded with clinical guidance; no source, edition, jurisdiction, upd`
- `14: | **P0** | Masked calling is a local timer, not a telephony service | Start/end only mutate state, yet claim that patient sees a masked platform number. | Disable the feature or integrate authorized telephony provisioning, call session/cons`
- `15: | **P1** | Provider analytics fabricates operational and financial results on failure | Dashboard API failure replaces data with revenue 4,200, 28 orders, 4.7 rating, 12% growth and fixed monthly bars; PDF/Excel controls only show toasts. |`
### payment_insurance_relevance
- `13: | **P0** | Medical reference library embeds a tiny static drug/interaction/ICD list as a clinical reference | Five medicines, three interactions and five ICD codes are hard-coded with clinical guidance; no source, edition, jurisdiction, upd`
- `16: | **P1** | Shared controls remain AR/EN only and use non-semantic text symbols | Security, clinical-reference, call and financial screens lack six-language/RTL-LTR and accessible icon/formatting coverage. | Complete reviewed AR/EN/UR/HI/BN/`
### error_empty_loading_retry_cancel
- `11: | **P0** | Device management and 2FA are fully local/fabricated | The screen starts with a static iPhone, MacBook and Android device list; toggles 2FA/biometrics only in React state; removal/log-out-all show success/confirm UI without serve`
- `12: | **P0** | Wearable screen fabricates connected devices and patient-health readings | Apple Watch/Apple Health show connected status with fixed HR 72/SpO2 98%/steps; connect actions only show toasts. | Remove the integration/health-data cla`
- `15: | **P1** | Provider analytics fabricates operational and financial results on failure | Dashboard API failure replaces data with revenue 4,200, 28 orders, 4.7 rating, 12% growth and fixed monthly bars; PDF/Excel controls only show toasts. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
