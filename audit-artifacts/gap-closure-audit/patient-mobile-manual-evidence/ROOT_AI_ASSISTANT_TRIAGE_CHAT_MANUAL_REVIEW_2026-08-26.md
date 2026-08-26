# Patient Mobile: Root AI medical assistant chat — manual review

## Scope boundary

This read-only source review covers `app/ai-assistant.tsx`. It does not validate triage-model safety, medical quality, PHI retention, consent, prompt-injection protections, provider review, citations, emergency escalation, auditability or endpoint authorization.

| Reviewed source | Scope |
|---|---|
| `app/ai-assistant.tsx` | Free-form medical assistant chat and prescription-translator handoff |
| `app/index.tsx` | Splash and authenticated/guest routing decision |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-AICHAT-001 | `CONFIRMED_DEFECT` | `ai-assistant.tsx:21–27, 48–73, 104–153` | UI presents a “smart medical assistant,” suggests symptom diagnosis/prescription reading/drug information, and sends free-form conversation history to `/ai/triage/chat`. It has no visible intended-use limitation, emergency guidance, clinical escalation, consent, citations, source attribution or high-risk-content boundary. | Clinically governed assistant contract, intended-use/safety guardrails, emergency/human escalation, consent/retention/audit and adversarial/runtime testing. |
| PM-AICHAT-002 | `CONFIRMED_DEFECT` | `ai-assistant.tsx:53–69` | If server response lacks `response`, client inserts a system-error text as an assistant message; on exception, it inserts a connectivity message as assistant content. The interface does not distinguish unavailable model/triage result from medical assistant output in conversation history. | Typed assistant/error state and no-result semantics; response provenance/version/citations and safe fallback UX. |
| PM-AICHAT-003 | `INSUFFICIENT_EVIDENCE` | `ai-assistant.tsx:34–51, 76–101` | Source forwards current history but cannot prove user/session ownership, message retention/deletion, PHI controls, server-side authorization or abuse/rate-limit behavior. | Auth/ownership/retention controls, PHI data flow assessment, rate limits and security tests. |
| PM-ROOT-001 | `STATIC_MATCHED_PARTIAL` | `app/index.tsx:17–36` | Splash considers any presence of SecureStore token or AsyncStorage guest flag sufficient to enter tabs. It does not validate/refresh/revoke either state, and read failure sends the patient to welcome. Static source cannot prove auth/guest session authority or safe recovery from stale/corrupt local state. | Central session bootstrap/validation and logout lifecycle; guest/auth boundary and expired/revoked-token runtime tests. |

## Conclusion

The root AI assistant represents a high-risk free-form medical interaction, and the splash route relies on local token/guest flags without validation. Neither supports a clinical-safety or production-readiness claim. Manual source review is complete only for the two listed Root inventory paths.
