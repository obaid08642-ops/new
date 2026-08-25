# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_DOCTOR_CLINICAL_WORKFLOW_GAPS_20260819.md`
- **Member SHA-256:** `aa97eaa419d45a0c4d6055e226057c3d8486dff080f116f726d7d7ef8b67fe4b`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | “Live consultation” is a simulated video/call interface | Screen displays an avatar with “Video Call Connected,” non-functional mute/camera buttons and a local end control; it does not establish or validate a LiveKit/voice/video `
- `8: | **P0** | In-consultation chat is local-only and lost | Send merely appends `Date.now()` messages to React state; attachment button has no action and no protected appointment chat endpoint is used. | Use the authoritative appointment/threa`
- `11: | **P0** | Prescription templates and custom medicine entry fabricate medical content | Static cold/diabetes templates, client-local saved templates, arbitrary custom drug strings and generic interaction warning are not medication-validated`
- `12: | **P1** | Prescribed route options are non-functional promises | WhatsApp/SMS, pharmacy, PDF and insurance-preapproval options are rendered as no-op touch rows. | Implement consented, secure, auditable route actions or remove/disable them `
- `13: | **P1** | Clinical document/QR claims require separate governance | Sick-leave screen claims QR verification and SMS delivery through local issued state; those output/QR contracts are not proven and remain fail-closed. | Keep clinical docu`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: | **P0** | “Live consultation” is a simulated video/call interface | Screen displays an avatar with “Video Call Connected,” non-functional mute/camera buttons and a local end control; it does not establish or validate a LiveKit/voice/video `
- `8: | **P0** | In-consultation chat is local-only and lost | Send merely appends `Date.now()` messages to React state; attachment button has no action and no protected appointment chat endpoint is used. | Use the authoritative appointment/threa`
- `9: | **P0** | EHR clinical history is hard-coded for every consultation | EHR tab always displays Type 2 diabetes, hypertension and penicillin allergy regardless of patient or source. | Remove all mock clinical history; load a minimum-necessar`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | “Live consultation” is a simulated video/call interface | Screen displays an avatar with “Video Call Connected,” non-functional mute/camera buttons and a local end control; it does not establish or validate a LiveKit/voice/video `
- `8: | **P0** | In-consultation chat is local-only and lost | Send merely appends `Date.now()` messages to React state; attachment button has no action and no protected appointment chat endpoint is used. | Use the authoritative appointment/threa`
- `9: | **P0** | EHR clinical history is hard-coded for every consultation | EHR tab always displays Type 2 diabetes, hypertension and penicillin allergy regardless of patient or source. | Remove all mock clinical history; load a minimum-necessar`
- `11: | **P0** | Prescription templates and custom medicine entry fabricate medical content | Static cold/diabetes templates, client-local saved templates, arbitrary custom drug strings and generic interaction warning are not medication-validated`
- `12: | **P1** | Prescribed route options are non-functional promises | WhatsApp/SMS, pharmacy, PDF and insurance-preapproval options are rendered as no-op touch rows. | Implement consented, secure, auditable route actions or remove/disable them `
- `13: | **P1** | Clinical document/QR claims require separate governance | Sick-leave screen claims QR verification and SMS delivery through local issued state; those output/QR contracts are not proven and remain fail-closed. | Keep clinical docu`
- `14: | **P1** | Clinical input/error/localization accessibility is insufficient | SOAP, diagnosis, prescriptions, chat and EHR content has raw Arabic/English copy, emoji controls and no six-language clinical review. | Complete clinically reviewe`
### payment_insurance_relevance
- `12: | **P1** | Prescribed route options are non-functional promises | WhatsApp/SMS, pharmacy, PDF and insurance-preapproval options are rendered as no-op touch rows. | Implement consented, secure, auditable route actions or remove/disable them `
### error_empty_loading_retry_cancel
- `8: | **P0** | In-consultation chat is local-only and lost | Send merely appends `Date.now()` messages to React state; attachment button has no action and no protected appointment chat endpoint is used. | Use the authoritative appointment/threa`
- `14: | **P1** | Clinical input/error/localization accessibility is insufficient | SOAP, diagnosis, prescriptions, chat and EHR content has raw Arabic/English copy, emoji controls and no six-language clinical review. | Complete clinically reviewe`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
