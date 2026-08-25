# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_SHARED_OPERATION_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `6a8a2d24906ce43260b520be1ed6ea0fa8f8b73178f57a1bc0f82123e78ff343`
- **Line count:** 48
- **Read range:** `1-48`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: The shared provider screens contained several user-visible states that were not backed by a contract verified in this batch. The problem was not visual polish: a provider could see an apparent device, ticket, invoice, read receipt, or compl`
- `15: | SupportCenter | Displayed fixed ticket records and status/history metadata; submitting to an unverified path promised a 24-hour response. | Fabricated support history and an unsubstantiated operational SLA. |`
- `16: | DeviceManagement | Displayed named devices and local 2FA/biometric/removal/logout success states without a session/device-management mutation. | False security posture and misleading account-control actions. |`
- `25: | DeviceManagement | Removed sample device identities and all local-only 2FA, biometric, remove-device, and logout-all controls. The screen states that verified session/device contracts are required. |`
- `46: This remediation prevents false operational claims; it does not supply replacement functionality. Re-enabling any action requires the corresponding backend contract, explicit authorization/ownership behavior, persistence semantics, error ha`
- `48: No payment, prescription, emergency, consent, QR, location, account, notification, or production data mutation occurred in this batch. The broader six-language screen migration and human accessibility/RTL review remain open.`
### backend_consumers_or_contracts
- `13: | PharmacyChatResponder | Opened Socket.IO without a verified authenticated handshake and appended local chat/invoice objects with `Date.now()`. | Unauthenticated channel use and a false record of a pharmacy-patient conversation or invoice.`
- `22: | PharmacyChatResponder | Removed the unauthenticated Socket.IO client, local message/invoice creation, and emoji-based invoice state. It now provides Arabic/English transparent unavailable content until a participant-authorized, persistent`
### auth_ownership
- `16: | DeviceManagement | Displayed named devices and local 2FA/biometric/removal/logout success states without a session/device-management mutation. | False security posture and misleading account-control actions. |`
- `25: | DeviceManagement | Removed sample device identities and all local-only 2FA, biometric, remove-device, and logout-all controls. The screen states that verified session/device contracts are required. |`
- `46: This remediation prevents false operational claims; it does not supply replacement functionality. Re-enabling any action requires the corresponding backend contract, explicit authorization/ownership behavior, persistence semantics, error ha`
### state_transitions
- `5: **Result:** **PASS — uncovered local/demo operation states are now contained behind transparent unavailable states.**`
- `9: The shared provider screens contained several user-visible states that were not backed by a contract verified in this batch. The problem was not visual polish: a provider could see an apparent device, ticket, invoice, read receipt, or compl`
- `11: | Surface | Confirmed issue | Risk if shown as live |`
- `14: | NotificationsCenter | Mark-read and mark-all-read changed only the local array before showing success. | Provider could believe a read receipt persisted when server state remained unchanged. |`
- `15: | SupportCenter | Displayed fixed ticket records and status/history metadata; submitting to an unverified path promised a 24-hour response. | Fabricated support history and an unsubstantiated operational SLA. |`
- `16: | DeviceManagement | Displayed named devices and local 2FA/biometric/removal/logout success states without a session/device-management mutation. | False security posture and misleading account-control actions. |`
- `22: | PharmacyChatResponder | Removed the unauthenticated Socket.IO client, local message/invoice creation, and emoji-based invoice state. It now provides Arabic/English transparent unavailable content until a participant-authorized, persistent`
- `23: | NotificationsCenter | Keeps only server-read notification data. Read actions no longer mutate local state and instead state that the operation is unavailable pending a verified server contract. |`
- `25: | DeviceManagement | Removed sample device identities and all local-only 2FA, biometric, remove-device, and logout-all controls. The screen states that verified session/device contracts are required. |`
- `26: | Regression coverage | Added contract tests that reject the removed fixtures/mutations and require the transparent unavailable states. |`
- `46: This remediation prevents false operational claims; it does not supply replacement functionality. Re-enabling any action requires the corresponding backend contract, explicit authorization/ownership behavior, persistence semantics, error ha`
### payment_insurance_relevance
- `9: The shared provider screens contained several user-visible states that were not backed by a contract verified in this batch. The problem was not visual polish: a provider could see an apparent device, ticket, invoice, read receipt, or compl`
- `13: | PharmacyChatResponder | Opened Socket.IO without a verified authenticated handshake and appended local chat/invoice objects with `Date.now()`. | Unauthenticated channel use and a false record of a pharmacy-patient conversation or invoice.`
- `22: | PharmacyChatResponder | Removed the unauthenticated Socket.IO client, local message/invoice creation, and emoji-based invoice state. It now provides Arabic/English transparent unavailable content until a participant-authorized, persistent`
- `26: | Regression coverage | Added contract tests that reject the removed fixtures/mutations and require the transparent unavailable states. |`
- `46: This remediation prevents false operational claims; it does not supply replacement functionality. Re-enabling any action requires the corresponding backend contract, explicit authorization/ownership behavior, persistence semantics, error ha`
- `48: No payment, prescription, emergency, consent, QR, location, account, notification, or production data mutation occurred in this batch. The broader six-language screen migration and human accessibility/RTL review remain open.`
### error_empty_loading_retry_cancel
- `23: | NotificationsCenter | Keeps only server-read notification data. Read actions no longer mutate local state and instead state that the operation is unavailable pending a verified server contract. |`
- `46: This remediation prevents false operational claims; it does not supply replacement functionality. Re-enabling any action requires the corresponding backend contract, explicit authorization/ownership behavior, persistence semantics, error ha`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
