# Phase 3 Provider — shared security, clinical reference and analytics gaps

## Confirmed safe control

The shared QR screen explicitly says that health QR generation/scanning is unavailable until secure verification, patient consent and access audit exist. This respects the required **fail-closed** QR governance boundary.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Device management and 2FA are fully local/fabricated | The screen starts with a static iPhone, MacBook and Android device list; toggles 2FA/biometrics only in React state; removal/log-out-all show success/confirm UI without server revocation. | Implement a protected device/session inventory, OTP/2FA enrolment/disable step-up, biometric-key binding, per-device revocation and global-session revocation with audit/retry; remove fake devices/toggles until then. |
| **P0** | Wearable screen fabricates connected devices and patient-health readings | Apple Watch/Apple Health show connected status with fixed HR 72/SpO2 98%/steps; connect actions only show toasts. | Remove the integration/health-data claim or implement consented provider-patient association, authorized vendor OAuth, provenance, data retention, clinical-display and error/revocation contracts. |
| **P0** | Medical reference library embeds a tiny static drug/interaction/ICD list as a clinical reference | Five medicines, three interactions and five ICD codes are hard-coded with clinical guidance; no source, edition, jurisdiction, update, licensing or decision-support boundary exists. | Remove it from clinical workflow or integrate an approved, versioned evidence source with provenance, searchable coverage, update/audit mechanism and clear decision-support limitations. |
| **P0** | Masked calling is a local timer, not a telephony service | Start/end only mutate state, yet claim that patient sees a masked platform number. | Disable the feature or integrate authorized telephony provisioning, call session/consent/participant authorization, masking, logs, retention and failure handling. |
| **P1** | Provider analytics fabricates operational and financial results on failure | Dashboard API failure replaces data with revenue 4,200, 28 orders, 4.7 rating, 12% growth and fixed monthly bars; PDF/Excel controls only show toasts. | Preserve an error/unavailable state, use server-authoritative period metrics, and implement secure owned exports or remove export actions. |
| **P1** | Shared controls remain AR/EN only and use non-semantic text symbols | Security, clinical-reference, call and financial screens lack six-language/RTL-LTR and accessible icon/formatting coverage. | Complete reviewed AR/EN/UR/HI/BN/FIL, accessible vector controls, locale-safe date/currency/number rendering and minimum-PHI review. |

## Decision

Shared Provider security, clinical-reference, telephony and analytics features are **P0 FIX/BLOCKED**. QR remains correctly unavailable; the other features must not claim security, clinical data, or financial insight until backed by governed contracts.
