# P22 dapp — inventory + build notes

Backend contracts live on sibling branches `p22-a` / `p22-b` (read via `git show <branch>:<path>`
from the main repo). This file records what was verified vs built, and every
`NEEDS-BACKEND` gap.

## Inventory (pre-existing screens in this tree)

| Surface | File | Verdict |
|---|---|---|
| 22.1 order-again | `app/pharmacy/reorder.tsx` | VERIFIED-EXISTS (draft rebuild + resubmit, no price/payment reuse) |
| 22.1 refill hub (legacy reminders) | `app/health/refills.tsx` | EXISTS but targets legacy `/health/reminders`, not P22.1 contract — new screen built |
| 22.2 wishlist (private) | `app/pharmacy/wishlist.tsx` | VERIFIED-EXISTS (private list only, no share) — share screen built |
| 22.3 alternatives (read-only list) | `app/pharmacy/product-detail.tsx` (`/medicines/:id/details`) | EXISTS partial (alternatives shown, no interaction warnings, no FBT) — bundles screen built |
| 22.4 order tracking timeline | `app/pharmacy/order-tracking.tsx` | VERIFIED-EXISTS (timeline + ETA text + manual refresh) — live map/slots/POD built separately |
| 22.5 orders list | `app/orders/index.tsx` | EXISTS (list/filter only, no cancel/edit actions) — manage screen built |
| 22.6 reschedule | `app/consultations/cancel-reschedule.tsx` | VERIFIED-EXISTS (`PATCH /care/appointments/:id/reschedule` + cancel) |
| 22.6 visit summary | `app/consultations/summary.tsx` | VERIFIED-EXISTS (`GET /care/appointments/:id/summary`) |
| 22.7 write review | `app/reviews/index.tsx` | EXISTS (posts to `/patient-ux/review`, no eligibility gate/photos/helpful) — gate built |
| 22.9 documents | `app/reports/*` | EXISTS partial (view/report timeline; no invoice download / Rx QR) — documents screen built |
| 22.14 SOS | `app/emergency/sos.tsx` | VERIFIED-EXISTS (`POST /emergency/trigger` + tel:997 fallback + quick calls) |
| 22.14 red-flag triage | `app/ai/triage.tsx` | VERIFIED-EXISTS (red-flag list + emergency guidance path) — banner hardening added |
| 22.13 rating prompts | — | MISSING — built config-gated util + wired to success moments |

## Built (this branch)

- P22.1: `src/utils/p22/refill-subscriptions.ts` + test + `app/pharmacy/refill-subscriptions.tsx`
  (subscribe/manage/cancel against `pharmacy/refills/subscriptions`; Rx-expiry guard client-side,
  backend enforces prescription validity per p22-a service).

## NEEDS-BACKEND

(none yet)
