# Native E2E findings (Maestro, Android)

Failures caused by the APP (not by a flow), one line each: severity, screen, steps, expected, actual, file:line, owner (Design = UI, S = backend/payment/booking).
Found by `tools/native/flows/*` through `.github/workflows/native-e2e.yml`.

| # | Sev | App / screen | Steps | Expected | Actual | file:line | Owner |
|---|---|---|---|---|---|---|---|
| 1 | medium | patient / Create account | type a full international number `+966501234567` in the phone field | the number is accepted as typed | the field strips every non-digit (`+` too), so `startsWith('+')` is never true and `+966` is added again: `+966966501234567` | patient-app/app/(auth)/register.tsx:133 and :53 | Design |
