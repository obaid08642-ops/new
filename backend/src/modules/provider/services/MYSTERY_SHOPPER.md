# Mystery-shopper checks — procedure + checklist (P22.12)

> The actual shopping (booking visits, calls, purchases) is operations work:
> `BLOCKED: mystery shopping runs need ops staffing + budget`.
> This file is the executable procedure so ops can start immediately.

## Cadence
- Monthly wave per city: 5% of active providers, min 3 per specialty/city.
- Shoppers are never the provider's own staff; rotate shoppers quarterly.

## Procedure
1. Admin picks the wave (low-tier + random sample of good-tier as control).
2. Shopper performs a scripted journey (booking → visit/order → support contact).
3. Shopper files the report within 24h (template: `mystery-shopper-report.template.md`).
4. Quality owner scores the report (0..100) and files it; score < 60 →
   `provider_complaints` entry (category `service`, reporter `mystery-shopper`)
   + scorecard recompute → automatic `provider_quality_alerts` row on breach.
5. Provider sees anonymized findings + 14-day improvement window; repeat
   failures → probation tier actions per policy.

## Checklist (every check pass/fail + evidence)
- [ ] Booking completable without calling support
- [ ] Acceptance within SLA (time-to-accept logged)
- [ ] Identity/credentials displayed match directory
- [ ] Price charged matches quoted price (no hidden fees)
- [ ] Hygiene / packaging / professionalism standards met
- [ ] Prescription validity respected (no OTC-substitution games)
- [ ] Support reachable + response within SLA when contacted
- [ ] Receipt/invoice issued correctly

## Scoring
- 8 checks × pass(12.5)/fail(0);critical fail (price, prescription, hygiene)
  caps the total at 59 regardless of other passes.
