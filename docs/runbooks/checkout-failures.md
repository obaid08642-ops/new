# Runbook: Checkout success rate low

**SLO:** 99% checkout success, 7-day window (`slo-targets.ts` → `checkout_success`).

## Diagnose
1. `curl -s $API/observability/summary | jq '.routes[] | select(.route|test("checkout"))'`.
2. Check the payment provider and Redis (cart/session) first — both sit in the checkout path.
3. Compare against the audit log: `AuditService.write` records each checkout step with the
   request id, so search that id to see exactly which step failed.

## Mitigate
- If the provider is degraded, do not fail closed silently: surface the retry state.
- If Redis is the cause, restart it; carts are not worth a total outage.

## Verify
Success ratio back over 99% for 15 minutes.
