# Phase 2 Patient — skin-analysis safety and image-privacy gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | The screen fabricates clinical metrics and recommendations absent from Backend output | Backend returns only `condition`, `confidence`, and `recommendation`; the client fills severity, colour, hydration/brightness/smoothness/evenness scores, advice, doctor note, and confidence defaults locally. | Remove every fabricated field, score, recommendation, and accuracy claim; render only a clinically approved, typed Backend response with source/version/provenance. |
| **P0** | Backend failure becomes a plausible analysis result | Backend catches AI failure and returns `condition: Unknown` with low confidence. Client accepts any condition and fills the invented metric/recommendation defaults, making a failure appear as a meaningful skin assessment. | Use an explicit error/unavailable envelope and never transition to results without validated result fields; provide retry and professional-care guidance only. |
| **P0** | Medical image is transmitted without a consent and retention contract | Camera/gallery image is converted to base64 and sent to the AI endpoint; there is no pre-upload sensitive-image consent, purpose/processor disclosure, size/type policy, retention/deletion policy, or special treatment of facial/identifying imagery. | Keep image analysis fail-closed until legal/product privacy approval; implement explicit informed consent, minimization, validated image controls, secure processing/storage contract, audit trail, deletion, and provider review boundary. |
| **P1** | Unsupported accuracy and coverage claims are shown | UI claims “50+ skin criteria,” database comparison, and displays confidence as “accuracy,” none of which is established by the raw AI prompt. | Remove unsupported clinical-performance claims and present a localized, regulated product disclaimer only after approval. |
| **P1** | AI prompt is diagnostic framing without a governed escalation pathway | Service asks a model to act as a dermatologist and identify a condition; the UI can send a user straight to generic consultation without a safe severity/red-flag path. | Restrict to an approved non-diagnostic informational experience or establish clinical validation, structured risk output, and reviewed escalation contracts. |
| **P1** | Arabic-only raw copy and static areas impair safe accessibility | Labels, consent-adjacent camera guidance, errors, recommendations, and area selection lack six-language and accessibility coverage. | Complete reviewed AR/EN/UR/HI/BN/FIL content and accessible camera/permission flows before release. |

## Decision

Skin analysis is **P0 FIX/BLOCKED**. It must not collect or transmit patient images, nor render health results, until the visual-medical consent, privacy, clinical-validation, typed response, truthful error, and multilingual accessibility requirements are met.
