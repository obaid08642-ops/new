# Patient Mobile: Community posting, votes and comments — manual review

## Scope boundary

This read-only source review covers both Community inventory routes. It does not establish author identity/role, moderator workflow, medical-content review, abuse/reporting controls, rate limits, content retention/deletion, anonymity, ownership, or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/community/hub.tsx` | Feed, categories, composer and publication |
| `app/community/post-detail.tsx` | Detail, vote, comment and native share |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-COM-001 | `STATIC_MATCHED_PARTIAL` | `community/hub.tsx:38–87, 119–269` | Feed and composer use server calls with basic error feedback, but post creation accepts free text/category only. “Sent for review” is a client statement; static source cannot prove moderation state, professional verification, PHI detection, consent, rate limits or abuse controls. | Community post/moderation state machine, author/role projection, PHI/medical-content policy, report/block/rate-limit controls and owner/stranger tests. |
| PM-COM-002 | `CONFIRMED_DEFECT` | `community/post-detail.tsx:115–119, 145–158` | Detail labels any non-anonymous author as “certified doctor” and renders doctor icon despite no source-provided clinician verification field. Missing post data is replaced by generic title/body. This is a misleading professional-authority claim. | Backend-authoritative author role/verification projection; truthful generic-member labels; moderation/safety review. |
| PM-COM-003 | `STATIC_MATCHED_PARTIAL` | `community/post-detail.tsx:64–96, 174–279` | Vote always sends `up` and comments always set `is_anonymous:false`; client updates counts/comments locally from response. Static review cannot prove vote state, duplicate/replay protection, commenter identity/privacy, deletion/edit rights, content scanning or ownership. | Idempotent vote/comment contracts, privacy/anonymity controls, moderation/audit and runtime abuse/ownership tests. |

## Conclusion

The Community routes are source-connected but cannot be considered clinically safe or professionally moderated. The non-anonymous-author doctor label is a confirmed misleading claim. Manual source review is complete only for these two inventory paths.
