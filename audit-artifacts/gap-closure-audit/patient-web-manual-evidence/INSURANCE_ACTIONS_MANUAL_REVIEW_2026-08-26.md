# Patient Web: Insurance actions — manual source review

`app/[locale]/insurance/page.tsx:19–38` fetches policy, benefits and claims but only renders policy summary and claim cards. It contains no action CTA. Benefits are fetched but not parsed/rendered. There is no localized insurance subroute for policy update, approval, co-pay, coverage check, provider network, payment split, refund status or claim submission.

| Mobile rows | Classification | Source-bounded gap |
|---|---|---|
| PM-126 add policy; PM-136 policy detail | `MISSING_CAPABILITY` | No policy create/update/document/validation/consent workflow. |
| PM-127 approval pending; PM-131 coverage check; PM-130 co-pay; PM-135 payment split | `MISSING_CAPABILITY` | No request→payer/provider decision→co-pay→patient payment→confirmation state or adverse/alternative path. |
| PM-134 network providers | `MISSING_CAPABILITY` | No network eligibility/provider discovery or authoritative plan routing surface. |
| PM-137 refund status; PM-138 submit claim | `MISSING_CAPABILITY` | No claim submission/evidence/dispute/refund/ledger/notification workflow. |

No backend insurance decision, plan benefit authority, payment ledger or runtime behavior is inferred from the page read.
