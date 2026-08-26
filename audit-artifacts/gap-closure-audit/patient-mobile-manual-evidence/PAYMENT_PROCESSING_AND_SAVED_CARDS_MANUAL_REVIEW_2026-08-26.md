# Patient Mobile: Payment processing and saved cards — partial manual review

## Scope boundary

This is an evidence-first **partial** wave covering only `app/payments/processing.tsx` and `app/wallet/cards.tsx`. It does not review or close the remaining payments, wallet, top-up, transfer, transaction or order routes. No product source, build, runtime test, deployment, merge or live payment action was performed.

| Reviewed source | Scope |
|---|---|
| `app/payments/processing.tsx` | Hosted checkout/WebView/browser hand-off, status polling, wallet top-up confirmation and success/failure routing |
| `app/wallet/cards.tsx` | Saved-card list/default/delete and add-card CTA |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-PAY-001 | `CONFIRMED_DEFECT` | `payments/processing.tsx:24–37, 117–225, 280–323, 390–425` | Payment processor derives transaction kind, booking ID, booking kind and displayed amount from route parameters. It heuristically selects verify vs Moyasar-sync endpoint by parsing the client-held payment ID string. On timeout, “cancel” only routes to a failure screen; it does not cancel or reload an authoritative payment/service state. A 15×3-second client poll budget is not a settlement state machine. | Canonical intent/payment record read keyed by opaque server ID; exact intent-to-booking/order/co-pay/wallet ledger binding; webhook-led terminal state; cancellation/timeout/retry semantics; server authority for displayed amount/service status. |
| PM-PAY-002 | `RUNTIME_REQUIRED` | `payments/processing.tsx:141–164, 166–210, 227–265` | Wallet top-up confirmation uses a repeated `POST /wallet/topup/confirm`; other payments call client-selected verify/sync endpoints and route from returned status. Static source cannot prove idempotent top-up crediting, callback authenticity, replay/duplicate poll protection, provider signature validation, webhook ordering, or reconciliation after external-browser/WebView hand-off. | Backend controller/service/ledger/webhook evidence; idempotency and replay tests; callback allowlist/deep-link verification; provider outage/pending/late-webhook reconciliation. |
| PM-PAY-003 | `CONFIRMED_DEFECT` | `wallet/cards.tsx:76–84, 86–117, 256–274, 338–376` | The screen claims PCI-DSS protection and no full-card retention, but its add-card CTA sends hard-coded full card numbers, fixed holder name `Ahmed`, and fixed expiry values directly to `POST /wallet/cards`. Default-card selection is only an optimistic local state mutation with no backend persistence. These are source-confirmed fake/payment-data defects. | Remove all hard-coded PAN/test identity inputs; provider-hosted tokenization only; no raw PAN in application API; server default-card mutation/ownership; PCI scope/threat-model evidence and security review. |
| PM-PAY-004 | `INSUFFICIENT_EVIDENCE` | `wallet/cards.tsx:58–74, 119–207` | The route reads and deletes saved cards, but source alone cannot establish token ownership, masked data integrity, default-card business rules, card-provider account-vault deletion, or whether a deleted/default card remains usable in existing intents. | Token-vault/card controller evidence; owner/stranger authorization; default-card invariant; provider detachment/webhook outcomes; runtime tests. |

## Conclusion

The two reviewed financial sources cannot support a production claim. The processor has a real-looking polling path but remains driven by route parameters and client endpoint heuristics pending backend/ledger reconciliation. Saved-card entry contains hard-coded full-card data that directly contradicts its own security statement. Only these two routes should be marked reviewed after the tracker is updated; all other financial routes remain unreviewed.
