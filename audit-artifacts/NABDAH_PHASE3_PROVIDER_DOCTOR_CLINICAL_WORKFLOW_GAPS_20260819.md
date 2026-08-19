# Phase 3 Provider — doctor consultation and clinical-workflow gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | “Live consultation” is a simulated video/call interface | Screen displays an avatar with “Video Call Connected,” non-functional mute/camera buttons and a local end control; it does not establish or validate a LiveKit/voice/video session. | Remove connection claims or integrate approved authenticated call room, participant authorization, consent, join/leave/no-show/audit and network-recovery contracts; test patient/provider session lifecycle. |
| **P0** | In-consultation chat is local-only and lost | Send merely appends `Date.now()` messages to React state; attachment button has no action and no protected appointment chat endpoint is used. | Use the authoritative appointment/thread contract with participant/time-window authorization, persistence, attachment controls, notification and retry/reconciliation. |
| **P0** | EHR clinical history is hard-coded for every consultation | EHR tab always displays Type 2 diabetes, hypertension and penicillin allergy regardless of patient or source. | Remove all mock clinical history; load a minimum-necessary, owner/appointment-authorized EHR DTO with explicit unavailable/consent states. |
| **P0** | E-prescription can bind to wrong/guest patient and corrupt duration | It falls back from patient ID to appointment ID then `guest_patient`; `parseInt` on Arabic duration strings such as `7 أيام`/`مستمر` yields 7/default, losing the prescribed duration. | Require server-derived patient/appointment identifiers and a typed medicine/dose/frequency/duration contract; reject missing/invalid context and do not issue clinical orders from display text. |
| **P0** | Prescription templates and custom medicine entry fabricate medical content | Static cold/diabetes templates, client-local saved templates, arbitrary custom drug strings and generic interaction warning are not medication-validated or provider-persisted. | Remove seeded/template clinical therapy and arbitrary unverified medicine creation; integrate an approved medication catalogue, dose/form/route validation, interaction/allergy checks, pharmacist/clinical review and owned versioned templates. |
| **P1** | Prescribed route options are non-functional promises | WhatsApp/SMS, pharmacy, PDF and insurance-preapproval options are rendered as no-op touch rows. | Implement consented, secure, auditable route actions or remove/disable them with truthful status. |
| **P1** | Clinical document/QR claims require separate governance | Sick-leave screen claims QR verification and SMS delivery through local issued state; those output/QR contracts are not proven and remain fail-closed. | Keep clinical document issuance/QR/sharing disabled until approved legal, identity, signature, retention, delivery and verification contracts exist. |
| **P1** | Clinical input/error/localization accessibility is insufficient | SOAP, diagnosis, prescriptions, chat and EHR content has raw Arabic/English copy, emoji controls and no six-language clinical review. | Complete clinically reviewed AR/EN/UR/HI/BN/FIL content, vector accessible controls, RTL/LTR validation and safe error states. |

## Decision

Doctor clinical operations are **P0 FIX/BLOCKED**. They currently present simulated consultation, fabricated EHR, medication and clinical-document behavior that must never be used for patient care or release readiness.
