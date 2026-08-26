# Patient Mobile: Global search, sponsored results and route handoff — manual review

## Scope boundary

This read-only source review covers `app/search/index.tsx`. It does not validate search ranking, results authorization, sponsored/ad disclosure, prices, provider/service availability, recent-search privacy, route ownership or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/search/index.tsx` | Global search, local history/filtering, sponsored sorting and result navigation |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-SRCH-001 | `STATIC_MATCHED_PARTIAL` | `search/index.tsx:31–63, 71–78, 161–218` | Search calls `/home/search`, stores queries locally, filters result types client-side and moves sponsored items first. Static source cannot prove ranking/relevance, consent/retention for health-sensitive searches, advertisement policy, result ownership, price/availability authority or query abuse controls. | Search/privacy/ad-disclosure model, retention controls, server-authoritative ranking/filtering, rate limiting and runtime tests. |
| PM-SRCH-002 | `CONFIRMED_DEFECT` | `search/index.tsx:79–103` | Result handoffs are type-only and discard search result context. Package result routes to Health tab; insurance routes to hub; family opens member-health by opaque ID; diagnostics and radiology share generic test detail. No selected quote/provider/service/offer/eligibility context is preserved. | Typed discovery-result schema and context-preserving route contracts; CTA→service/provider/slot/payment/insurance chain tests. |
| PM-SRCH-003 | `MISSING_CAPABILITY` | `search/index.tsx:109–118` | Microphone icon is purely presentational and has no handler. Voice search is not implemented in this route. | Hide/label as unavailable or implement consented platform speech input with privacy/security controls. |

## Conclusion

Search is source-connected but its sponsored/privacy semantics and downstream handoffs remain unproven; multiple service journeys lose selection context. Manual source review is complete only for `app/search/index.tsx`.
