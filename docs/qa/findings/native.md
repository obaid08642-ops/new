# Native E2E findings (Maestro, Android)

Failures caused by the APP (not by a flow), one line each: severity, screen, steps, expected, actual, file:line, owner (Design = UI, S = backend/payment/booking).
Found by `tools/native/flows/*` through `.github/workflows/native-e2e.yml`.

| # | Sev | App / screen | Steps | Expected | Actual | file:line | Owner |
|---|---|---|---|---|---|---|---|
| 1 | medium | patient / Create account | type a full international number `+966501234567` in the phone field | the number is accepted as typed | the field strips every non-digit (`+` too), so `startsWith('+')` is never true and `+966` is added again: `+966966501234567` | patient-app/app/(auth)/register.tsx:133 and :53 | Design |
| 2 | medium | patient / Insurance (hub, policy detail) | open Account → Insurance with a saved policy; look for a way to remove the card | the card can be added, edited and deleted | add (`add-policy.tsx`) and change (`InsuranceHubView` sheet) exist; nothing in `InsuranceHubView.tsx`, `app/insurance/policy-detail.tsx` or `add-policy.tsx` deletes or removes a policy | patient-app/src/components/insurance/InsuranceHubView.tsx:106 | Design (UI), S (endpoint) |
| 3 | low | patient / Lab tests hub → basket | on Lab tests choose the place "clinic" (centre), open a test, "Book now" | the basket keeps a centre visit | the basket opens on "At home · 1 item" with "no home service for this test in your area" and the next button disabled; the user must change the place again in the basket's context bar | patient-app/app/(tabs)/diagnostics.tsx:59 (`place`) vs patient-app/app/diagnostics/cart.tsx:51 (`ctx.choice.mode`) | Design |
