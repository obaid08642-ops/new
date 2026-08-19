# Phase 2 Patient — medical data risk review

## Result

A focused source scan across maternity, nutrition, diagnostics booking, and mental-health assessment confirms that synthetic medical values are concentrated in the main Patient implementation and must remain remediation/blocker findings rather than being treated as runtime truth.

| Surface | Evidence in `main` | Classification | Required gate |
|---|---|---|---|
| Maternity hub | Local-storage fallback and optimistic local checkup/profile updates; default checkup collection is used when backend data is absent | **FIX / MEDICAL-SAFETY REVIEW** | Backend-confirmed profile/checkup state, no fabricated pregnancy state, rollback on failed mutation |
| Nutrition AI plan builder | Real multi-step input and API flow already exists; no synthetic clinical profile was newly confirmed in this focused scan | **SOURCE PRESENT / VERIFY** | API response schema, loading/error/empty states, safety copy and no local clinical truth |
| Diagnostics booking confirmation | `homeVisitFee = 50`, VAT computed locally, `scheduled_at = Date.now()+24h`, fallback provider id `provider_lab_default`, and example document URL `https://example.com/doctor_request.pdf` are sent in the booking payload | **FIX / BLOCKED** | Server availability/pricing/scheduling/provider/storage/payment/insurance contracts; no fabricated value may reach a real booking |
| Mental-health self-assessment | Questions are declared as dynamically fetched; no fabricated questions were confirmed in this focused scan | **SOURCE PRESENT / SAFETY VERIFY** | Consent, crisis-safe handling, response ownership, and backend persistence/error behavior |

## Decision

The diagnostics hardcoded fee, VAT, tomorrow-date scheduling, provider fallback, and example document URL are confirmed source risks and remain in the remediation queue. The maternity local fallback/optimistic medical state is also not acceptable as the authoritative medical record. This report does not modify source code, activate any blocked contract, or claim that the corresponding workflows are production-ready.
