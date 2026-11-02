# Commission numbers: one source (session F, 2026-11-01)

Reviewer item from S's contract review (#2367): the code held three commission sets. Now there is one.

## The rule
1. **Stored values:** `finance_config` document `{ key: 'commissions' }`: `service_types.<type>.percent` (pharmacy, doctor, lab, radiology, nursing) and `tax.vat_percent`. A provider's earning is resolved by `CommissionResolver` (`finance-engine.module.ts`): campaign / provider / category / service **rules** (`commissionrules`), then `finance_config`, then the system default. `provider-ops` then lets the percent the admin set on the provider (`commission_cash_pct` / `commission_insurance_pct`) win over the service default.
2. **Written once:** `backend/src/common/commission-defaults.ts`: `DEFAULT_COMMISSIONS` (what an empty `finance_config` is seeded with), `DEFAULT_COMMISSION_PERCENT = 10` (the resolver's system default), `DEFAULT_VAT_PERCENT = 15`, and `commissionServiceTypeOf()` (profile type / legacy name → service type).
3. **Guard:** `common/commission-single-source.spec.ts` fails on a literal fallback percent (`.percent ?? 10`, `commission_rate: 10`, ...) or a second per-service table anywhere else in `backend/src`.

## What the three sets were, and what they do now
| Where | Numbers | Now |
| --- | --- | --- |
| `commission-defaults.ts` + `CommissionResolver` (settlement: `provider-ops.creditEarning`, `pharmacy-allocation`) | pharmacy 10, doctor 15, lab 12, radiology 12, nursing 15; system default 10 | **unchanged**: this is the live set |
| `admin-governance.module.ts` `CommissionsController.list` (display fallback) | pharmacy 5, lab 8, radiology 10, home_care 15, other 10 | reads `CommissionResolver` for the provider's service type, so the screen shows what the settlement will charge |
| `insurance-engine` `FinanceCoreService.rateFor` (admin `POST /admin/finance/ledger/accrue`, not the settlement) | consultation/video/audio/chat 15, clinic 12, home_visit/nursing/physiotherapy 18, pharmacy 10, lab 12, radiology 12, default 15 | a `commissionrules` row with `rate` if one exists, else `CommissionResolver` (nursing 15 etc.) |
| Literal fallbacks `?? 10` / `?? 15` / `commission_rate: 10` / schema `default: 10` | 10 / 15 | the two constants above (same numbers) |

**The settlement's effective numbers are not changed.** Changed on purpose: the admin commissions list (display only) and the manual ledger-accrue endpoint (no client calls it besides an e2e probe), which no longer use their own tables.

## Live numbers
Code resolves, for a service with no rule and no provider override: pharmacy 10, doctor 15, lab 12, radiology 12, nursing 15 (the seed), and 10 for any other type. VAT on the commission 15. The values the admin has edited in `finance_config` are not readable from this session (no database access; no tests against production). Read-only line for ops, names and numbers only:

```js
db.finance_config.findOne({ key: 'commissions' }, { _id: 0, 'service_types': 1, 'tax.vat_percent': 1 })
db.commissionrules.find({ active: { $ne: false } }, { _id: 0, scope: 1, scope_id: 1, service_type: 1, percent: 1, effective_to: 1 })
db.provider_profiles.aggregate([{ $match: { $or: [{ commission_cash_pct: { $type: 'number' } }, { commission_insurance_pct: { $type: 'number' } }] } }, { $group: { _id: { cash: '$commission_cash_pct', ins: '$commission_insurance_pct' }, n: { $sum: 1 } } }])
```

## For the owner / reviewer (found, not changed)
- **Unseeded config:** until the admin finance suite or the legal service has seeded `finance_config`, the resolver charges 10 for every type, while the seed (and the admin screen) say doctor 15, lab 12, radiology 12, nursing 15. Seeding on first start would make the live number match the screen; it changes what an unseeded database charges, so it is not done here.
- **`commission_rate` on the provider profile** (schema default 10, written by the admin "commission" field) is ignored by the settlement. Only `commission_cash_pct` / `commission_insurance_pct` count. The admin list no longer shows `commission_rate`.
- **VAT default 15** is still written in `billing.module.ts`, `common/quote.ts`, `business-rules.module.ts`, `booking-ops.module.ts`, `ai-commerce.service.ts` (VAT, not commission; two of those files are in open PR #2368). They should read `DEFAULT_VAT_PERCENT` after it merges.


## Owner decisions of 2026-11-01 (B, C, D): defaults, per-provider commission, promotions

**Order (CommissionResolver, one call for the settlement, the admin screens and the ledger tools):**
campaign rule → the provider's running **promotion** → the provider's **own commission** (a provider rule, then the percent set on the provider: `commission_cash_pct` / `commission_insurance_pct`) → category rule → service rule → `finance_config` type default → the one system default (10).

**B. Seeding the defaults.** `tools/ops/tasks/79b-commission-seed.sh` (tool `backend/src/scripts/commission-seed.ts`): dry run by default, `APPLY=yes` set by the reviewer after reading it. Writes pharmacy 10, doctor 15, lab 12, radiology 12, nursing 15 and VAT 15 into `finance_config` `commissions` **only where a field is missing** (compare-and-set on "absent"; an admin-set value, even 0, is never touched); a missing document is created the way the admin finance suite creates it. Prints service names and numbers only. Not listed in `tools/ops/RUN` (the reviewer lists it after the rehearsal).

**C. Per-provider commission really drives the settlement.** `PUT /admin/commissions/:id` with `commission` used to write only `commission_rate`, which the settlement ignores; it now sets cash and insured visits (`commission_cash_pct`, `commission_insurance_pct`), needs a `reason` (10+ characters) and is audited (`provider_commission_override_set`, before and after). New: `GET/PUT/DELETE /admin/provider-commissions/:providerId` (view what is charged now and why; set cash / insurance; clear it so the type default applies), also audited, permission `finance.config.edit`. Admin screen: "عمولة مزود محدد وعروض الانطلاق" on the commissions page. Heads-up: `compat/admin-spa.module.ts` also declares `@Controller('commissions')` with `PUT :id` (a commission *rule* by id); the two share a path and are not told apart by the router, which is why the new screen uses `provider-commissions`.

**D. Promotions.** Collection `provider_commission_promos`: `percent` (0..100, 0 allowed), `starts_at` / `ends_at` (a plain date is a Saudi day, 00:00 to 23:59:59.999 UTC+3; both ends are inside the promo), `max_orders` (the first N completed orders), `used_orders`, `active`. A promo needs an end (dates or N, or both: whichever comes first). One at a time per provider: setting a new one cancels the old. `PUT /admin/provider-commissions/:providerId/promo` sets it, `DELETE` cancels it, `GET` lists with state (`scheduled`, `active`, `ended`, `exhausted`, `cancelled`) and orders left. `creditEarning` counts each completed order against an order-limited promo with an atomic increment (`used_orders < max_orders`), so N is never exceeded even when completions arrive together; with none left the same order is charged the normal commission. The earning row records `commission_source: provider_promo` and `promo_id`. A repeated completion of the same order is not counted twice. Specs: boundary dates (one millisecond before and after both ends), N reached, the 0% case, the fall-back, concurrency.

Not covered: an order that is refunded after it was counted still counts as used (the promo is "first N completed orders").
