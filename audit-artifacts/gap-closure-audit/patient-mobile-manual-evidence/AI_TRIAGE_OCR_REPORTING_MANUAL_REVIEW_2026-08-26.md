# Patient Mobile: AI triage, OCR and reporting — manual review

## Scope boundary

This is a read-only source review of all seven AI inventory routes. It does not validate AI model quality, clinical safety, prompt/data retention, provider review, accuracy of OCR/translation, triage rules, emergency response, report ownership, or any backend authorization/monitoring.

| Reviewed source | Scope |
|---|---|
| `app/ai/symptom-checker.tsx` | Redirect to guided triage |
| `app/ai/triage.tsx` | Structured symptom/red-flag triage |
| `app/ai/chat-doctor.tsx` | Redirect away from free-form AI chat |
| `app/ai/monthly-report.tsx` | Client-aggregated monthly health report |
| `app/ai/prescription-translator.tsx` | Image-based OCR/translation and pharmacy/reminder CTAs |
| `app/ai/skin-analysis.tsx` | Structured skin self-check |
| `app/ai/symptom-timeline.tsx` | Redirect to guided triage |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-AI-001 | `STATIC_MATCHED_PARTIAL` | `ai/triage.tsx:11–46, 48–75`; `ai/skin-analysis.tsx:11–49` | Structured triage and skin self-check explicitly omit diagnosis/treatment and post bounded observations. Results still use server-returned care level to drive emergency/consultation CTA; static review cannot prove model/rule source, safety validation, patient population limits, red-flag coverage, emergency geography, logging, human review or result authorization. | Clinically governed decision-support contract, model/rule/version/citation and monitoring governance; intended-use/limitations/emergency policy; security/PHI and runtime safety tests. |
| PM-AI-002 | `CONFIRMED_DEFECT` | `ai/triage.tsx:37–57`; `mental-health/crisis-support.tsx:63–69` | Triage uses hard-coded `tel:911`, while other Arabic/Saudi-facing surfaces use different emergency numbers. There is no region selection/verification, call outcome, dispatch handoff, current-location sharing or failure state. | Jurisdiction-aware emergency directory and reviewed escalation policy; actual call/dispatch delivery state; localization/region tests. |
| PM-AI-003 | `CONFIRMED_DEFECT` | `ai/prescription-translator.tsx:84–127, 153–261` | OCR response mapping invents patient-visible defaults for doctor, date, dosage, timing, duration, notes and alternatives whenever fields are absent. It then exposes medication interactions/side effects and routes directly to pharmacy, product detail and reminders without a verified prescription/order/medicine identity. This is a source-confirmed unsafe fabricated-medication-data path. | Prescription OCR provenance/confidence/uncertainty UI; medically reviewed extraction; prescription identity/validity/ownership; no fabricated defaults; pharmacist/doctor verification and pharmacy contract. |
| PM-AI-004 | `STATIC_MATCHED_PARTIAL` | `ai/monthly-report.tsx:35–70, 121–236` | Monthly report avoids earlier fake health scores and aggregates several API collections, but computes month membership, status counts and up/down/stable trends client-side. Partial endpoint failure is silently converted to empty sections unless all sources fail. Static source cannot prove source ownership, completeness, clinical interpretation, data freshness or report audit. | Authoritative report aggregation/period/timezone and partial-failure contract; data provenance/freshness; clinical-review boundary; owner/stranger tests. |
| PM-AI-005 | `MISSING_CAPABILITY` | `ai/chat-doctor.tsx:1–6`; `ai/symptom-checker.tsx:1–6`; `ai/symptom-timeline.tsx:1–6` | Free-form AI doctor chat, legacy diagnostic symptom checker and symptom timeline are redirects to structured triage because their unsafe/reasoning expectations are unavailable. They are not implemented clinical features. | Product scope/discovery decision, supported safe workflow and clinically governed implementation only if approved. |

## Conclusion

The AI routes contain safety-oriented redirects and structured non-diagnostic input flows, but they cannot substantiate AI clinical readiness. Prescription translation contains confirmed client-fabricated medical fields and direct downstream medication CTAs. The evidence requires clinical governance, contractual authority and runtime validation before remediation or production claims.
